import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {
  consumeAiCall,
  quotaExhaustedBody,
  refundAiCall,
} from '../../lib/aiMetering.js';
import type {EntitledRequest} from '../../middleware/loadEntitlement.js';
import {htmlToText} from '../../lib/htmlToText.js';
import {normalizePastedRecipeHtml} from '../../lib/normalizePastedRecipeHtml.js';
import {mapRowToRecipeDetail} from '../../lib/mapRowToRecipeDetail.js';
import {parseWithClaude} from '../../lib/parseWithClaude.js';
import {RecipeImportError} from '../../lib/recipeImportToInput.js';
import {prepareImportedRecipeInput} from '../../lib/prepareImportedRecipeInput.js';
import {saveNewRecipeFromInput} from '../../lib/saveRecipeFromInput.js';
import {
  IMPORT_TEXT_PLAIN_MAX,
  ImportTextSchema,
  validate,
} from '../../lib/schemas.js';
import {findDuplicateRecipe} from '../../lib/findDuplicateRecipe.js';
import {resolveImportedImageUrl} from '../../lib/uploadRecipeImageServer.js';
import {
  StageTimeoutError,
  withTimeout,
  withTimeoutOrNull,
  withTimeoutSignal,
} from '../../lib/withTimeout.js';
import {GET_RECIPE_DETAIL_SQL, setVersionImageUrl} from '../recipes/queries.js';
import {duplicateRecipeBody} from './respondIfDuplicateImport.js';

type QueryFn = typeof defaultQuery;

/**
 * Per-stage bounds for this route (issue #492). Every stage below was
 * awaited unboundedly, so a single stuck dependency held the 201 response
 * past the live e2e suite's 60s budget (and, for real imports, past any
 * client timeout). The defaults sum to under 60s; a stage that breaches
 * its bound fails fast — a retryable 5xx for the parse/prepare/save
 * stages, "import without image" for the image stage — instead of
 * hanging. Each bound can be overridden by environment variable (the
 * route's tests use this to exercise the timeout path in milliseconds).
 */
const stageTimeoutMs = (envName: string, fallback: number): number => {
  const raw = process.env[envName];
  if (raw === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseTimeoutMs = () =>
  stageTimeoutMs('IMPORT_TEXT_PARSE_TIMEOUT_MS', 20_000);
const prepareTimeoutMs = () =>
  stageTimeoutMs('IMPORT_TEXT_PREPARE_TIMEOUT_MS', 10_000);
const saveTimeoutMs = () =>
  stageTimeoutMs('IMPORT_TEXT_SAVE_TIMEOUT_MS', 15_000);
const imageTimeoutMs = () =>
  stageTimeoutMs('IMPORT_TEXT_IMAGE_TIMEOUT_MS', 20_000);
const postImageTimeoutMs = () =>
  stageTimeoutMs('IMPORT_TEXT_POST_IMAGE_TIMEOUT_MS', 10_000);

export const importFromText = async (
  req: EntitledRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(ImportTextSchema, req, res);
  if (!body.ok) {
    return;
  }
  const {html, imageCandidate} = normalizePastedRecipeHtml(body.data.text);
  const plainText = htmlToText(html);
  if (plainText.length === 0) {
    res
      .status(400)
      .json({error: 'No recipe text found after removing formatting'});
    return;
  }
  if (plainText.length > IMPORT_TEXT_PLAIN_MAX) {
    res
      .status(400)
      .json({
        error: 'Validation failed',
        issues: [
          {
            path: 'text',
            message: `Too big: expected at most ${IMPORT_TEXT_PLAIN_MAX} characters of recipe content`,
          },
        ],
      });
    return;
  }
  const quota = await consumeAiCall(req.userId, req.entitlement.plan, queryFn, {
    unlimited: req.entitlement.unlimited,
  });
  if (!quota.ok) {
    res
      .status(402)
      .json(quotaExhaustedBody('ai_quota_exhausted', quota.used, quota.limit));
    return;
  }
  let parsed: Awaited<ReturnType<typeof parseWithClaude>>;
  try {
    // Cancellable bound: on timeout the signal aborts the in-flight
    // Anthropic request (and blocks the description fallback from
    // starting), instead of leaving the provider call running after
    // the quota refund below.
    parsed = await withTimeoutSignal(
      signal => parseWithClaude(plainText, null, undefined, signal),
      parseTimeoutMs(),
      'recipe text parse',
    );
  } catch (error) {
    await refundAiCall(req.userId, queryFn, quota.periodStart);
    throw error;
  }
  try {
    let input: Awaited<ReturnType<typeof prepareImportedRecipeInput>>;
    try {
      // Same cancellable bound for preparation: the signal reaches tag
      // selection, so a late tag-options completion cannot start a new
      // Anthropic request after the deadline.
      input = await withTimeoutSignal(
        signal =>
          prepareImportedRecipeInput({
            recipe: parsed,
            userId: req.userId,
            queryFn,
            signal,
          }),
        prepareTimeoutMs(),
        'imported recipe preparation',
      );
    } catch (error) {
      if (error instanceof StageTimeoutError) {
        // Preparation can call Anthropic, so a timeout here is a
        // failed provider call: refund it (as the parse stage does)
        // and answer a retryable 504 instead of a generic 500.
        await refundAiCall(req.userId, queryFn, quota.periodStart);
        res
          .status(504)
          .json({error: 'Recipe preparation timed out — please retry'});
        return;
      }
      throw error;
    }
    // Duplicate warning (#296): warn before a second copy is created;
    // the client resubmits with allowDuplicate to import anyway. The AI
    // call is NOT refunded here: the parse succeeded and produced the
    // warning, so it stays charged — refunding it would let repeated
    // imports of an already-owned recipe bypass the monthly quota
    // entirely (each attempt costs a real provider call but would never
    // count). Refunds remain for failed provider calls only (above).
    // Bound the underlying query, not respondIfDuplicateImport: that
    // helper writes the 409 itself, so racing it could let a lookup
    // that completes after a timeout response still write a late 409.
    // Racing findDuplicateRecipe here means a late result is simply
    // abandoned — nothing writes a response from it. The helper stays
    // in place for its other caller (the image import route).
    if (!body.data.allowDuplicate) {
      let duplicate: Awaited<ReturnType<typeof findDuplicateRecipe>>;
      try {
        duplicate = await withTimeout(
          findDuplicateRecipe(req.userId, input, queryFn),
          saveTimeoutMs(),
          'imported recipe duplicate lookup',
        );
      } catch (error) {
        if (!(error instanceof StageTimeoutError)) {
          throw error;
        }
        res
          .status(504)
          .json({error: 'Duplicate lookup timed out — please retry'});
        return;
      }
      if (duplicate) {
        res.status(409).json(duplicateRecipeBody(duplicate));
        return;
      }
    }
    // The save runs in a transaction the timeout race cannot cancel,
    // so a timeout must not simply report a retryable failure while
    // the transaction may still commit (a blind retry could then
    // duplicate the recipe). On timeout, first give the save one
    // more bounded window to settle and use its real outcome; only
    // if it still has not settled, check whether it committed in the
    // meantime (answer the duplicate warning a retry would draw) and
    // otherwise answer 504 — a later retry is still protected by the
    // pre-save duplicate guard above.
    const savePromise = saveNewRecipeFromInput(
      {userId: req.userId, input, createdVia: 'import_text'},
      queryFn,
    );
    let saved: Awaited<typeof savePromise>;
    try {
      saved = await withTimeout(
        savePromise,
        saveTimeoutMs(),
        'imported recipe save',
      );
    } catch (error) {
      if (!(error instanceof StageTimeoutError)) {
        throw error;
      }
      try {
        saved = await withTimeout(
          savePromise,
          saveTimeoutMs(),
          'imported recipe save settlement',
        );
      } catch (settlementError) {
        if (!(settlementError instanceof StageTimeoutError)) {
          throw settlementError;
        }
        // Skip the lookup when the user already opted into a duplicate:
        // it would find the pre-existing copy and wrongly answer the 409
        // warning instead of the retryable 504. Bound the lookup like
        // every other stage — the save likely timed out because the DB
        // is slow, so an unbounded lookup could hang the request again;
        // a lookup failure or timeout maps to null (504) via the catch.
        const committed = body.data.allowDuplicate
          ? null
          : await withTimeout(
              findDuplicateRecipe(req.userId, input, queryFn),
              saveTimeoutMs(),
              'imported recipe duplicate lookup',
            ).catch(() => null);
        if (committed) {
          res.status(409).json(duplicateRecipeBody(committed));
        } else {
          res
            .status(504)
            .json({error: 'Recipe save timed out — please retry'});
        }
        return;
      }
    }
    const {recipeId, versionId, recipe} = saved;
    if (imageCandidate) {
      // resolveImportedImageUrl bounds itself and resolves null on a
      // download/upload timeout; this race is the route-level backstop
      // (and covers test doubles of that module): a stuck image stage
      // degrades to an import without an image, never a hung 201.
      const imageUrl = await withTimeoutOrNull(
        resolveImportedImageUrl(imageCandidate, req.supabaseUid, recipeId),
        imageTimeoutMs(),
        'imported image resolution',
      );
      if (imageUrl) {
        // The recipe is already saved at this point, so the post-image
        // DB work must not hang or fail the 201: bound the image-url
        // update and the detail refresh together under one deadline,
        // and on timeout fall through to the saved detail below (with
        // the image URL unset) instead of answering a 5xx — the save
        // succeeded; only whether the image attached is unresolved.
        const refreshed = await withTimeoutOrNull(
          (async () => {
            await setVersionImageUrl(versionId, imageUrl, queryFn);
            return queryFn(GET_RECIPE_DETAIL_SQL, [recipeId, req.userId]);
          })(),
          postImageTimeoutMs(),
          'imported recipe post-image update',
        );
        const row = refreshed?.rows[0];
        if (row) {
          const detail = mapRowToRecipeDetail(
            row as Parameters<typeof mapRowToRecipeDetail>[0],
          );
          res.status(201).json({...detail, recipeId, versionId});
          return;
        }
      }
    }
    res.status(201).json({...recipe, recipeId, versionId});
  } catch (error) {
    if (error instanceof RecipeImportError) {
      res.status(422).json({error: error.message});
      return;
    }
    throw error;
  }
};

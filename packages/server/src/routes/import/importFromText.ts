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
import {resolveImportedImageUrl} from '../../lib/uploadRecipeImageServer.js';
import {GET_RECIPE_DETAIL_SQL, setVersionImageUrl} from '../recipes/queries.js';

type QueryFn = typeof defaultQuery;

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
  const quota = await consumeAiCall(req.userId, req.entitlement.plan, queryFn);
  if (!quota.ok) {
    res
      .status(402)
      .json(quotaExhaustedBody('ai_quota_exhausted', quota.used, quota.limit));
    return;
  }
  let parsed: Awaited<ReturnType<typeof parseWithClaude>>;
  try {
    parsed = await parseWithClaude(plainText, null);
  } catch (error) {
    await refundAiCall(req.userId, queryFn, quota.periodStart);
    throw error;
  }
  try {
    const input = await prepareImportedRecipeInput({
      recipe: parsed,
      userId: req.userId,
      queryFn,
    });
    const {recipeId, versionId, recipe} = await saveNewRecipeFromInput(
      {userId: req.userId, input, createdVia: 'import_text'},
      queryFn,
    );
    if (imageCandidate) {
      const imageUrl = await resolveImportedImageUrl(
        imageCandidate,
        req.supabaseUid,
        recipeId,
      );
      if (imageUrl) {
        await setVersionImageUrl(versionId, imageUrl, queryFn);
        const refreshed = await queryFn(GET_RECIPE_DETAIL_SQL, [
          recipeId,
          req.userId,
        ]);
        const row = refreshed.rows[0];
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

import type {Response} from 'express';
import {load} from 'cheerio';

import {query as defaultQuery} from '../../db/query.js';
import {
  checkRecipeCap,
  consumeAiCall,
  quotaExhaustedBody,
  refundAiCall,
  withRecipeCap,
} from '../../lib/aiMetering.js';
import type {EntitledRequest} from '../../middleware/loadEntitlement.js';
import {parseSchemaOrg} from '../../lib/parseSchemaOrg.js';
import {parseWithClaude} from '../../lib/parseWithClaude.js';
import {RecipeImportError} from '../../lib/recipeImportToInput.js';
import {prepareImportedRecipeInput} from '../../lib/prepareImportedRecipeInput.js';
import {saveNewRecipeFromInput} from '../../lib/saveRecipeFromInput.js';
import {ImportUrlSchema, validate} from '../../lib/schemas.js';
import {AiResponseParseError} from '../../lib/validate.js';
import {findDuplicateRecipe} from '../../lib/findDuplicateRecipe.js';
import {duplicateRecipeBody} from './respondIfDuplicateImport.js';

type QueryFn = typeof defaultQuery;

// User-actionable URL-import failures (#297). These map to 422s here in
// the route instead of escaping to the global error handler, which can
// only emit the generic 'AI service error' / 'Internal server error'
// strings and gives the user nothing to act on.
export const URL_IMPORT_FETCH_ERROR =
  "We couldn't fetch that page — the site may be blocking imports. Try pasting the recipe text instead.";
export const URL_IMPORT_NO_RECIPE_ERROR =
  "That page doesn't appear to contain a recipe.";

const fetchPage = async (url: string): Promise<string> => {
  const response = await fetch(url, {
    headers: {'User-Agent': 'EciperayBot/1.0'},
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
};

const parseFromHtml = async (html: string, url: string) => {
  const $ = load(html);
  const schemaResult = parseSchemaOrg($);
  if (schemaResult) {
    return {...schemaResult, sourceUrl: url};
  }
  const pageText = $('body').text().replaceAll(/\s+/g, ' ').trim();
  return parseWithClaude(pageText, url);
};

export const importFromUrl = async (
  req: EntitledRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(ImportUrlSchema, req, res);
  if (!body.ok) {
    return;
  }
  const {url, allowDuplicate} = body.data;
  // URL imports create recipes, so the Free recipe cap applies. Check up
  // front so we fail fast before fetching the page or burning AI quota; the
  // save below re-checks atomically against concurrent imports.
  const earlyCap = await checkRecipeCap(
    req.userId,
    req.entitlement.plan,
    queryFn,
  );
  if (!earlyCap.ok) {
    res
      .status(402)
      .json(quotaExhaustedBody('recipe_limit', earlyCap.used, earlyCap.limit));
    return;
  }
  // A fetch failure (non-OK status, blocked scraper, network error,
  // timeout) is the site's answer, not a server fault: report it as
  // such instead of letting it escape as a generic 500 (#297).
  let html: string;
  try {
    html = await fetchPage(url);
  } catch {
    res.status(422).json({error: URL_IMPORT_FETCH_ERROR});
    return;
  }
  // The schema.org path is free; only the Claude fallback burns AI quota.
  // The parse itself is synchronous and cheap, so check up front.
  const needsAi = parseSchemaOrg(load(html)) === null;
  let aiConsumed = false;
  let aiPeriodStart: string | undefined;
  if (needsAi) {
    const quota = await consumeAiCall(
      req.userId,
      req.entitlement.plan,
      queryFn,
      {unlimited: req.entitlement.unlimited},
    );
    if (!quota.ok) {
      res
        .status(402)
        .json({
          ...quotaExhaustedBody('ai_quota_exhausted', quota.used, quota.limit),
          message:
            'AI import quota exhausted for this month. Pages with recipe markup still import for free.',
        });
      return;
    }
    aiConsumed = true;
    aiPeriodStart = quota.periodStart;
  }
  try {
    const parsed = await parseFromHtml(html, url);
    const result = await withRecipeCap(
      req.userId,
      req.entitlement.plan,
      queryFn,
      async q => {
        const input = await prepareImportedRecipeInput({
          recipe: parsed,
          userId: req.userId,
          queryFn: q,
          options: {sourceUrl: url},
        });
        // Duplicate warning (#296): checked inside the cap callback so a
        // warned import never saves; the match rides out as a sentinel
        // because this handler responds after the cap scope closes.
        const duplicate = allowDuplicate
          ? null
          : await findDuplicateRecipe(req.userId, input, q);
        if (duplicate) {
          return {kind: 'duplicate', duplicate} as const;
        }
        const saved = await saveNewRecipeFromInput(
          {userId: req.userId, input, createdVia: 'import_url'},
          q,
        );
        return {kind: 'saved', saved} as const;
      },
    );
    if (!result.ok) {
      res
        .status(402)
        .json(quotaExhaustedBody('recipe_limit', result.used, result.limit));
      return;
    }
    if (result.value.kind === 'duplicate') {
      // The parse saved nothing: refund the AI call when the Claude
      // fallback consumed one, so the override stays usable at the quota
      // boundary (#296, same as the text/image paths).
      if (aiConsumed) {
        await refundAiCall(req.userId, queryFn, aiPeriodStart);
      }
      res.status(409).json(duplicateRecipeBody(result.value.duplicate));
      return;
    }
    const {recipeId, versionId, recipe} = result.value.saved;
    res.status(201).json({...recipe, recipeId, versionId});
  } catch (error) {
    if (aiConsumed) {
      await refundAiCall(req.userId, queryFn, aiPeriodStart);
    }
    if (error instanceof RecipeImportError) {
      res.status(422).json({error: error.message});
      return;
    }
    // The Claude fallback produced no schema-valid recipe from the
    // page text: the page doesn't contain a recipe (or not one the
    // parser can read). Say so instead of the global handler's
    // 'AI service error', which is reserved for genuine provider
    // failures (Anthropic.APIError still rethrows to it) (#297).
    if (error instanceof AiResponseParseError) {
      res.status(422).json({error: URL_IMPORT_NO_RECIPE_ERROR});
      return;
    }
    throw error;
  }
};

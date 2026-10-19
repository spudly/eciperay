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

type QueryFn = typeof defaultQuery;

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
  const {url} = body.data;
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
  const html = await fetchPage(url);
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
        return saveNewRecipeFromInput(
          {userId: req.userId, input, createdVia: 'import_url'},
          q,
        );
      },
    );
    if (!result.ok) {
      res
        .status(402)
        .json(quotaExhaustedBody('recipe_limit', result.used, result.limit));
      return;
    }
    const {recipeId, versionId, recipe} = result.value;
    res.status(201).json({...recipe, recipeId, versionId});
  } catch (error) {
    if (aiConsumed) {
      await refundAiCall(req.userId, queryFn, aiPeriodStart);
    }
    if (error instanceof RecipeImportError) {
      res.status(422).json({error: error.message});
      return;
    }
    throw error;
  }
};

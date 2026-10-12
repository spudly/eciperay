import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {
  consumeAiCall,
  quotaExhaustedBody,
  refundAiCall,
} from '../../lib/aiMetering.js';
import type {EntitledRequest} from '../../middleware/loadEntitlement.js';
import {getParam} from '../../lib/getParam.js';
import {
  fetchVersionNutrition,
  mapRowToNutritionInfo,
} from '../../lib/nutritionQueries.js';
import {fetchRecipeDetail} from '../../lib/recipeQueries.js';
import {refreshRecipeNutrition} from '../../lib/refreshRecipeNutrition.js';

type QueryFn = typeof defaultQuery;

const parseForceRefresh = (value: unknown): boolean =>
  value === '1' || value === 'true';

export const getNutrition = async (
  req: EntitledRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const recipe = await fetchRecipeDetail(
    getParam(req, 'id'),
    req.userId,
    queryFn,
  );
  if (!recipe) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }

  const forceRefresh = parseForceRefresh(req.query['refresh']);
  if (!forceRefresh) {
    const stored = await fetchVersionNutrition(recipe.versionId, queryFn);
    const info = stored ? mapRowToNutritionInfo(stored) : null;
    if (info) {
      // Cached nutrition is free — no quota consumed.
      res.json(info);
      return;
    }
  }

  const quota = await consumeAiCall(req.userId, req.entitlement.plan, queryFn);
  if (!quota.ok) {
    res
      .status(402)
      .json(quotaExhaustedBody('ai_quota_exhausted', quota.used, quota.limit));
    return;
  }

  try {
    const refreshed = await refreshRecipeNutrition(recipe.versionId, queryFn);
    if (!refreshed) {
      res.status(404).json({error: 'Recipe not found'});
      return;
    }
    res.json(refreshed);
  } catch {
    await refundAiCall(req.userId, queryFn);
    res.status(502).json({error: 'Failed to estimate nutrition'});
  }
};

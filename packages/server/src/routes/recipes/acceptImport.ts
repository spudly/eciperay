import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {
  autoImageContextFromDetail,
  scheduleAutoGenerateRecipeImage,
} from '../../lib/autoGenerateRecipeImage.js';
import {fetchRecipeDetail} from '../../lib/recipeQueries.js';
import {getParam} from '../../lib/getParam.js';

type QueryFn = typeof defaultQuery;

export const acceptImport = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const recipeId = getParam(req, 'id');
  const recipe = await fetchRecipeDetail(recipeId, req.userId, queryFn);
  if (!recipe) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  const refreshed = await fetchRecipeDetail(recipeId, req.userId, queryFn);
  if (!refreshed) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  // #535: accepting an import is the normal import save action — an
  // imageless recipe gets an auto-generated image, scheduled from the
  // refreshed detail after the lineage flip (the scheduler skips recipes
  // that already carry an image).
  scheduleAutoGenerateRecipeImage(
    {
      userId: req.userId,
      supabaseUid: req.supabaseUid,
      recipe: autoImageContextFromDetail(refreshed),
    },
    queryFn,
  );
  res.json(refreshed);
};

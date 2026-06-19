import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {getParam} from '../../lib/getParam.js';
import {fetchRecipeDetail} from '../../lib/recipeQueries.js';
import {RecipeUpdateSchema, validate} from '../../lib/schemas.js';

import {setVersionImageUrl} from './queries.js';

type QueryFn = typeof defaultQuery;

export const updateRecipe = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(RecipeUpdateSchema, req, res);
  if (!body.ok) {
    return;
  }
  const recipeId = getParam(req, 'id');
  const recipe = await fetchRecipeDetail(recipeId, req.userId, queryFn);
  if (!recipe) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  await setVersionImageUrl(recipe.versionId, body.data.imageUrl, queryFn);
  const refreshed = await fetchRecipeDetail(recipeId, req.userId, queryFn);
  if (!refreshed) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  res.json(refreshed);
};

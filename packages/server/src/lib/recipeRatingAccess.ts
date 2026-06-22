import type {Response} from 'express';

import {query as defaultQuery} from '../db/query.js';
import type {AuthedRequest} from '../middleware/requireAuth.js';

import {buildRecipeDetailWithRatings} from './buildRecipeDetailWithRatings.js';
import {getParam} from './getParam.js';
import {loadReadableRecipeRow} from './recipeReadAccess.js';

type QueryFn = typeof defaultQuery;

export const respondWithRecipeAndRatings = async (
  recipeId: string,
  viewerUserId: string,
  res: Response,
  queryFn: QueryFn,
) => {
  const row = await loadReadableRecipeRow(recipeId, viewerUserId, queryFn);
  if (!row) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  res.json(await buildRecipeDetailWithRatings(row, viewerUserId, queryFn));
};

export const loadReadableRecipeForRating = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const recipeId = getParam(req, 'id');
  const row = await loadReadableRecipeRow(recipeId, req.userId, queryFn);
  if (!row) {
    res.status(404).json({error: 'Recipe not found'});
    return null;
  }
  return {recipeId, row};
};

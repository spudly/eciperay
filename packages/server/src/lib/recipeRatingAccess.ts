import type {Response} from 'express';

import {query as defaultQuery} from '../db/query.js';
import type {AuthedRequest} from '../middleware/requireAuth.js';
import {GET_PUBLIC_RECIPE_DETAIL_SQL} from '../routes/recipes/sqlConstants.js';

import {buildRecipeDetailWithRatings} from './buildRecipeDetailWithRatings.js';
import {getParam} from './getParam.js';
import {mapRowToRecipeDetail} from './mapRowToRecipeDetail.js';
import {canReadRecipe, toRecipeAccessRecord} from './recipeAccess.js';
import {userHasShareGrant} from './shareGrant.js';

type QueryFn = typeof defaultQuery;

export const loadReadableRecipeRow = async (
  recipeId: string,
  userId: string,
  queryFn: QueryFn,
) => {
  const result = await queryFn(GET_PUBLIC_RECIPE_DETAIL_SQL, [recipeId]);
  const row = result.rows[0] as
    | Parameters<typeof mapRowToRecipeDetail>[0]
    | undefined;
  if (!row) {
    return null;
  }

  const hasShareGrant = await userHasShareGrant(recipeId, userId, queryFn);
  if (!canReadRecipe(toRecipeAccessRecord(row), {userId, hasShareGrant})) {
    return null;
  }

  return row;
};

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

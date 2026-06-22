import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {canWriteRecipe} from '../../lib/recipeAccess.js';
import {RecipeRatingInputSchema, validate} from '../../lib/schemas.js';
import {
  loadReadableRecipeForRating,
  respondWithRecipeAndRatings,
} from '../../lib/recipeRatingAccess.js';

import {
  deleteCommunityRating,
  updateOwnerStarRating,
  upsertCommunityRating,
} from './recipeRatingQueries.js';

type QueryFn = typeof defaultQuery;

export const putRecipeRating = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(RecipeRatingInputSchema, req, res);
  if (!body.ok) {
    return;
  }

  const loaded = await loadReadableRecipeForRating(req, res, queryFn);
  if (!loaded) {
    return;
  }

  const {recipeId, row} = loaded;
  if (canWriteRecipe({ownerUserId: row.user_id}, req.userId)) {
    const result = await updateOwnerStarRating(
      recipeId,
      req.userId,
      body.data.stars,
      queryFn,
    );
    if (result.rowCount === 0) {
      res.status(404).json({error: 'Recipe not found'});
      return;
    }
  } else {
    await upsertCommunityRating(
      {
        recipeId,
        userId: req.userId,
        stars: body.data.stars,
        contentRevision: row.content_revision,
      },
      queryFn,
    );
  }

  await respondWithRecipeAndRatings(recipeId, req.userId, res, queryFn);
};

export const deleteRecipeRating = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const loaded = await loadReadableRecipeForRating(req, res, queryFn);
  if (!loaded) {
    return;
  }

  const {recipeId, row} = loaded;
  if (canWriteRecipe({ownerUserId: row.user_id}, req.userId)) {
    const result = await updateOwnerStarRating(
      recipeId,
      req.userId,
      null,
      queryFn,
    );
    if (result.rowCount === 0) {
      res.status(404).json({error: 'Recipe not found'});
      return;
    }
  } else {
    await deleteCommunityRating(recipeId, req.userId, queryFn);
  }

  await respondWithRecipeAndRatings(recipeId, req.userId, res, queryFn);
};

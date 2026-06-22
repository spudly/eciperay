import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {getParam} from '../../lib/getParam.js';
import {loadReadableRecipeRow} from '../../lib/recipeReadAccess.js';
import {
  mapRowToRecipeComment,
  type RecipeCommentRow,
} from '../../lib/mapRowToRecipeComment.js';

import {listRecipeComments} from './recipeCommentQueries.js';

type QueryFn = typeof defaultQuery;

export const mapRecipeComments = (
  rows: RecipeCommentRow[],
  recipeContentRevision: number,
) => rows.map(row => mapRowToRecipeComment(row, recipeContentRevision));

export const listRecipeCommentsForReadableRecipe = async (
  recipeId: string,
  userId: string,
  queryFn: QueryFn,
) => {
  const row = await loadReadableRecipeRow(recipeId, userId, queryFn);
  if (!row) {
    return null;
  }
  const result = await listRecipeComments(recipeId, queryFn);
  return mapRecipeComments(
    result.rows as RecipeCommentRow[],
    row.content_revision,
  );
};

export const respondWithRecipeComments = async (
  recipeId: string,
  userId: string,
  res: Response,
  queryFn: QueryFn,
) => {
  const comments = await listRecipeCommentsForReadableRecipe(
    recipeId,
    userId,
    queryFn,
  );
  if (!comments) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  res.json(comments);
};

export const listRecipeCommentsRoute = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  await respondWithRecipeComments(
    getParam(req, 'id'),
    req.userId,
    res,
    queryFn,
  );
};

import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {getParam} from '../../lib/getParam.js';
import {
  mapRowToRecipeComment,
  type RecipeCommentRow,
} from '../../lib/mapRowToRecipeComment.js';
import {loadReadableRecipeRow} from '../../lib/recipeReadAccess.js';
import {RecipeCommentInputSchema, validate} from '../../lib/schemas.js';

import {getRecipeComment, updateRecipeComment} from './recipeCommentQueries.js';

type QueryFn = typeof defaultQuery;

export const updateRecipeCommentRoute = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(RecipeCommentInputSchema, req, res);
  if (!body.ok) {
    return;
  }

  const recipeId = getParam(req, 'id');
  const commentId = getParam(req, 'commentId');
  const row = await loadReadableRecipeRow(recipeId, req.userId, queryFn);
  if (!row) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }

  const updated = await updateRecipeComment(
    {commentId, recipeId, userId: req.userId, body: body.data.body},
    queryFn,
  );
  if (updated.rowCount === 0) {
    res.status(404).json({error: 'Comment not found'});
    return;
  }

  const detail = await getRecipeComment(commentId, recipeId, queryFn);
  const commentRow = detail.rows[0] as RecipeCommentRow | undefined;
  if (!commentRow) {
    res.status(404).json({error: 'Comment not found'});
    return;
  }

  res.json(mapRowToRecipeComment(commentRow, row.content_revision));
};

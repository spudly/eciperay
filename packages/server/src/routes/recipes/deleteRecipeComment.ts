import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {canWriteRecipe} from '../../lib/recipeAccess.js';
import {getParam} from '../../lib/getParam.js';
import {loadReadableRecipeRow} from '../../lib/recipeReadAccess.js';

import {
  deleteRecipeCommentByAuthor,
  deleteRecipeCommentByOwner,
} from './recipeCommentQueries.js';

type QueryFn = typeof defaultQuery;

export const deleteRecipeCommentRoute = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const recipeId = getParam(req, 'id');
  const commentId = getParam(req, 'commentId');
  const row = await loadReadableRecipeRow(recipeId, req.userId, queryFn);
  if (!row) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }

  const isOwner = canWriteRecipe({ownerUserId: row.user_id}, req.userId);
  const result = isOwner
    ? await deleteRecipeCommentByOwner(commentId, recipeId, queryFn)
    : await deleteRecipeCommentByAuthor(
        {commentId, recipeId, userId: req.userId},
        queryFn,
      );

  if (result.rowCount === 0) {
    res.status(404).json({error: 'Comment not found'});
    return;
  }

  res.status(204).send();
};

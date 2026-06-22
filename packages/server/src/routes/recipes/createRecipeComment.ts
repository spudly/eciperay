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

import {getRecipeComment, insertRecipeComment} from './recipeCommentQueries.js';

type QueryFn = typeof defaultQuery;

export const createRecipeComment = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(RecipeCommentInputSchema, req, res);
  if (!body.ok) {
    return;
  }

  const recipeId = getParam(req, 'id');
  const row = await loadReadableRecipeRow(recipeId, req.userId, queryFn);
  if (!row) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }

  const inserted = await insertRecipeComment(
    {
      recipeId,
      userId: req.userId,
      body: body.data.body,
      contentRevision: row.content_revision,
    },
    queryFn,
  );
  const commentId = inserted.rows[0]?.['id'] as string | undefined;
  if (!commentId) {
    res.status(500).json({error: 'Failed to create comment'});
    return;
  }

  const detail = await getRecipeComment(commentId, recipeId, queryFn);
  const commentRow = detail.rows[0] as RecipeCommentRow | undefined;
  if (!commentRow) {
    res.status(500).json({error: 'Failed to load comment'});
    return;
  }

  res.status(201).json(mapRowToRecipeComment(commentRow, row.content_revision));
};

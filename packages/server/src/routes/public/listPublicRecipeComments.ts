import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {getParam} from '../../lib/getParam.js';
import {loadPublicReadableRecipeRow} from '../../lib/recipeReadAccess.js';
import type {OptionalAuthedRequest} from '../../middleware/optionalAuth.js';
import {listRecipeComments} from '../recipes/recipeCommentQueries.js';
import {mapRecipeComments} from '../recipes/listRecipeComments.js';
import type {RecipeCommentRow} from '../../lib/mapRowToRecipeComment.js';

type QueryFn = typeof defaultQuery;

export const listPublicRecipeComments = async (
  req: OptionalAuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const recipeId = getParam(req, 'id');
  const access = await loadPublicReadableRecipeRow(req, recipeId, queryFn);
  if (access.status === 'not_found') {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  if (access.status === 'forbidden') {
    res.status(403).json({error: 'Recipe access denied'});
    return;
  }

  const result = await listRecipeComments(recipeId, queryFn);
  res.json(
    mapRecipeComments(
      result.rows as RecipeCommentRow[],
      access.row.content_revision,
    ),
  );
};

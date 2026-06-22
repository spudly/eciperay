import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {getParam} from '../../lib/getParam.js';
import {mapRowToRecipeDetail} from '../../lib/mapRowToRecipeDetail.js';
import {canReadRecipe, toRecipeAccessRecord} from '../../lib/recipeAccess.js';

import {GET_RECIPE_DETAIL_SQL} from './queries.js';

type QueryFn = typeof defaultQuery;

export const getRecipe = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const result = await queryFn(GET_RECIPE_DETAIL_SQL, [
    getParam(req, 'id'),
    req.userId,
  ]);
  const row = result.rows[0] as
    | Parameters<typeof mapRowToRecipeDetail>[0]
    | undefined;
  if (!row || !canReadRecipe(toRecipeAccessRecord(row), {userId: req.userId})) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  res.json(mapRowToRecipeDetail(row));
};

import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {getParam} from '../../lib/getParam.js';
import {mapRowToVersionSummary} from '../../lib/mapRowToRecipeDetail.js';

import {GET_RECIPE_DETAIL_SQL, LIST_VERSIONS_SQL} from './queries.js';

type QueryFn = typeof defaultQuery;

export const listVersions = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const recipeId = getParam(req, 'id');
  const recipe = await queryFn(GET_RECIPE_DETAIL_SQL, [recipeId, req.userId]);
  if (recipe.rows.length === 0) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  const result = await queryFn(LIST_VERSIONS_SQL, [recipeId, req.userId]);
  res.json(
    result.rows.map(row =>
      mapRowToVersionSummary(
        row as Parameters<typeof mapRowToVersionSummary>[0],
      ),
    ),
  );
};

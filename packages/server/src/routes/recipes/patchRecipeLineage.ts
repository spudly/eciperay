import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {getParam} from '../../lib/getParam.js';
import {mapRowToRecipeDetail} from '../../lib/mapRowToRecipeDetail.js';
import {RecipeLifecyclePatchSchema, validate} from '../../lib/schemas.js';

import {GET_RECIPE_DETAIL_SQL} from './queries.js';
import {setLineageStatus} from './versionQueries.js';

type QueryFn = typeof defaultQuery;

export const patchRecipeLineage = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(RecipeLifecyclePatchSchema, req, res);
  if (!body.ok) {
    return;
  }
  const recipeId = getParam(req, 'id');
  const result = await setLineageStatus(
    recipeId,
    req.userId,
    body.data.status,
    queryFn,
  );
  if (result.rowCount === 0) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  const detail = await queryFn(GET_RECIPE_DETAIL_SQL, [recipeId, req.userId]);
  const row = detail.rows[0];
  if (!row) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  res.json(
    mapRowToRecipeDetail(row as Parameters<typeof mapRowToRecipeDetail>[0]),
  );
};

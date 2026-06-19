import type {Response} from 'express';

import {runTransactional} from '../../db/withTransaction.js';
import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {fetchVersionDetail} from '../../lib/fetchVersionDetail.js';
import {getParam} from '../../lib/getParam.js';
import {mapRowToRecipeDetail} from '../../lib/mapRowToRecipeDetail.js';

import {GET_RECIPE_DETAIL_SQL} from './queries.js';
import {setActiveVersion} from './versionQueries.js';

type QueryFn = typeof defaultQuery;

export const activateVersion = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const recipeId = getParam(req, 'id');
  const versionId = getParam(req, 'versionId');
  const version = await fetchVersionDetail(
    versionId,
    recipeId,
    req.userId,
    queryFn,
  );
  if (!version) {
    res.status(404).json({error: 'Version not found'});
    return;
  }
  await runTransactional(queryFn, q =>
    setActiveVersion(recipeId, versionId, q),
  );
  const recipe = await queryFn(GET_RECIPE_DETAIL_SQL, [recipeId, req.userId]);
  const row = recipe.rows[0];
  if (!row) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  res.json(
    mapRowToRecipeDetail(row as Parameters<typeof mapRowToRecipeDetail>[0]),
  );
};

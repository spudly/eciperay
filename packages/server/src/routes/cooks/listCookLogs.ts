import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {fetchVersionDetail} from '../../lib/fetchVersionDetail.js';
import {getParam} from '../../lib/getParam.js';

import {mapRowToCookLog} from './mapRowToCookLog.js';

type QueryFn = typeof defaultQuery;

const LIST_COOK_LOGS_SQL = `
  select cl.*
  from cook_logs cl
  join recipe_versions rv on rv.id = cl.recipe_version_id
  join recipes r on r.id = rv.recipe_id
  where cl.recipe_version_id = $1 and r.id = $2 and r.user_id = $3
  order by cl.cooked_at desc
`;

export const listCookLogs = async (
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
  const result = await queryFn(LIST_COOK_LOGS_SQL, [
    versionId,
    recipeId,
    req.userId,
  ]);
  res.json(
    result.rows.map(row =>
      mapRowToCookLog(row as Parameters<typeof mapRowToCookLog>[0]),
    ),
  );
};

import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {fetchVersionDetail} from '../../lib/fetchVersionDetail.js';
import {getParam} from '../../lib/getParam.js';

type QueryFn = typeof defaultQuery;

// Only the entry's own author can delete it: the delete is scoped to
// the requesting user, so another user's entry (or a missing id)
// deletes nothing and reads as not found.
const DELETE_COOK_LOG_SQL = `
  delete from cook_logs
  where id = $1 and recipe_version_id = $2 and user_id = $3
`;

export const deleteCookLog = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const recipeId = getParam(req, 'id');
  const versionId = getParam(req, 'versionId');
  const cookLogId = getParam(req, 'cookLogId');
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
  const result = await queryFn(DELETE_COOK_LOG_SQL, [
    cookLogId,
    versionId,
    req.userId,
  ]);
  if (result.rowCount === 0) {
    res.status(404).json({error: 'Cook log not found'});
    return;
  }
  res.status(204).send();
};

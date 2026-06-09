import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {getParam} from '../../lib/getParam.js';
import {mapRowToRecipeDraft} from '../../lib/mapRowToRecipeDraft.js';

type QueryFn = typeof defaultQuery;

const LIST_DRAFTS_SQL = `
  select * from recipe_drafts
  where recipe_id = $1 and status = $2
  order by created_at desc
`;

export const listDrafts = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const status = req.query['status'];
  if (status !== 'pending') {
    res.status(400).json({error: 'Only status=pending is supported'});
    return;
  }
  const result = await queryFn(LIST_DRAFTS_SQL, [getParam(req, 'id'), status]);
  res.json(
    result.rows.map(row =>
      mapRowToRecipeDraft(row as Parameters<typeof mapRowToRecipeDraft>[0]),
    ),
  );
};

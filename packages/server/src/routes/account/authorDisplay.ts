import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {
  fetchAuthorDisplaySettings,
  updateAuthorDisplaySettings,
} from '../../lib/authorDisplayQueries.js';
import {AuthorDisplaySchema, validate} from '../../lib/schemas.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';

type QueryFn = typeof defaultQuery;

export const getAuthorDisplay = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  res.json(await fetchAuthorDisplaySettings(req.userId, queryFn));
};

export const putAuthorDisplay = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(AuthorDisplaySchema, req, res);
  if (!body.ok) {
    return;
  }
  const updated = await updateAuthorDisplaySettings(
    req.userId,
    body.data,
    queryFn,
  );
  if (!updated) {
    res.status(404).json({error: 'User not found'});
    return;
  }
  res.json(updated);
};

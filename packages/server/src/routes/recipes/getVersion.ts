import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {fetchVersionDetail} from '../../lib/fetchVersionDetail.js';
import {getParam} from '../../lib/getParam.js';

type QueryFn = typeof defaultQuery;

export const getVersion = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const version = await fetchVersionDetail(
    getParam(req, 'versionId'),
    getParam(req, 'id'),
    req.userId,
    queryFn,
  );
  if (!version) {
    res.status(404).json({error: 'Version not found'});
    return;
  }
  res.json(version);
};

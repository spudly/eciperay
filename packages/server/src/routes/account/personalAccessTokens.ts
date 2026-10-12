import type {Response} from 'express';
import {z} from 'zod';

import {query as defaultQuery} from '../../db/query.js';
import {getParam} from '../../lib/getParam.js';
import {
  createPersonalAccessToken,
  listPersonalAccessTokens,
  revokePersonalAccessToken,
} from '../../lib/personalAccessTokens.js';
import {validate} from '../../lib/validate.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';

type QueryFn = typeof defaultQuery;

const createTokenSchema = z.object({name: z.string().min(1).max(100)});

export const createToken = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(createTokenSchema, req, res);
  if (!body.ok) {
    return;
  }
  const {token, record} = await createPersonalAccessToken(
    req.userId,
    body.data.name,
    queryFn,
  );
  // The plaintext token is only ever returned here, at creation time.
  res.status(201).json({...record, token});
};

export const listTokens = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  res.json(await listPersonalAccessTokens(req.userId, queryFn));
};

export const revokeToken = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const revoked = await revokePersonalAccessToken(
    req.userId,
    getParam(req, 'id'),
    queryFn,
  );
  if (!revoked) {
    res.status(404).json({error: 'Token not found'});
    return;
  }
  res.status(204).send();
};

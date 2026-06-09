import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {SyncUserSchema, validate} from '../../lib/schemas.js';
import {upsertUserRecord} from '../../lib/upsertUser.js';

type QueryFn = typeof defaultQuery;

export const syncUser = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(SyncUserSchema, req, res);
  if (!body.ok) {
    return;
  }
  if (!req.userEmail) {
    res.status(400).json({error: 'Authenticated user has no email'});
    return;
  }
  const result = await upsertUserRecord(
    {
      supabaseUid: req.supabaseUid,
      email: req.userEmail,
      displayName: body.data.displayName ?? null,
    },
    queryFn,
  );
  res.status(200).json(result.rows[0]);
};

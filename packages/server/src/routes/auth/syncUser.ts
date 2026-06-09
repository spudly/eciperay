import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {SyncUserSchema, validate} from '../../lib/schemas.js';

type QueryFn = typeof defaultQuery;
type UpsertOptions = {
  supabaseUid: string;
  email: string;
  displayName: string | null;
};

const UPSERT_USER_SQL = `
  insert into users (supabase_uid, email, display_name)
  values ($1, $2, $3)
  on conflict (supabase_uid)
  do update set email        = excluded.email,
                display_name = coalesce(excluded.display_name, users.display_name)
  returning id, supabase_uid, email, display_name, created_at
`;

const upsertUser = (
  {supabaseUid, email, displayName}: UpsertOptions,
  queryFn: QueryFn,
) => queryFn(UPSERT_USER_SQL, [supabaseUid, email, displayName]);

export const syncUser = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(SyncUserSchema, req, res);
  if (!body.ok) {
    return;
  }
  const opts = {
    supabaseUid: req.userId,
    email: body.data.email,
    displayName: body.data.displayName ?? null,
  };
  const result = await upsertUser(opts, queryFn);
  res.status(200).json(result.rows[0]);
};

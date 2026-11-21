import type {Response} from 'express';
import type {User} from '@eciperay/types';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';

type QueryFn = typeof defaultQuery;

const ME_SQL = `select id, supabase_uid, email, display_name, is_admin, created_at from users where id = $1`;

type MeRow = {
  id: string;
  supabase_uid: string;
  email: string;
  display_name: string | null;
  is_admin: boolean;
  created_at: string | Date;
};

/**
 * GET /auth/me — the signed-in user's profile, including `isAdmin` (#621):
 * clients gate the Tags management UI on this server-computed flag, never on a
 * client-side comparison.
 */
export const getMe = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const result = await queryFn(ME_SQL, [req.userId]);
  const row = result.rows[0] as MeRow | undefined;
  if (!row) {
    res.status(404).json({error: 'User not found'});
    return;
  }
  const user: User = {
    id: row.id,
    supabaseUid: row.supabase_uid,
    email: row.email,
    displayName: row.display_name,
    isAdmin: row.is_admin === true,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at,
  };
  res.status(200).json(user);
};

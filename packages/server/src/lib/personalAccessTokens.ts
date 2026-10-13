import {createHash, randomBytes} from 'node:crypto';

import type {
  PersonalAccessToken,
  PersonalAccessTokenWithSecret,
} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';

type QueryFn = typeof defaultQuery;

export const PERSONAL_ACCESS_TOKEN_PREFIX = 'ecp_';

type PersonalAccessTokenRow = {
  id: string;
  name: string;
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

type TokenUser = {id: string; supabaseUid: string; email: string};

const TOKEN_COLUMNS =
  'id, name, token_prefix, created_at, last_used_at, revoked_at';

const mapRowToToken = (row: PersonalAccessTokenRow): PersonalAccessToken => ({
  id: row.id,
  name: row.name,
  tokenPrefix: row.token_prefix,
  createdAt: row.created_at,
  lastUsedAt: row.last_used_at,
  revokedAt: row.revoked_at,
});

const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

const generateToken = (): {
  token: string;
  tokenHash: string;
  tokenPrefix: string;
} => {
  const token = `${PERSONAL_ACCESS_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
  return {token, tokenHash: hashToken(token), tokenPrefix: token.slice(0, 12)};
};

export const createPersonalAccessToken = async (
  userId: string,
  name: string,
  queryFn: QueryFn,
): Promise<PersonalAccessTokenWithSecret> => {
  const {token, tokenHash, tokenPrefix} = generateToken();
  const result = await queryFn<PersonalAccessTokenRow>(
    `insert into personal_access_tokens
       (user_id, name, token_hash, token_prefix)
     values ($1, $2, $3, $4)
     returning ${TOKEN_COLUMNS}`,
    [userId, name, tokenHash, tokenPrefix],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error('Failed to create personal access token');
  }
  return {...mapRowToToken(row), token};
};

export const listPersonalAccessTokens = async (
  userId: string,
  queryFn: QueryFn,
): Promise<PersonalAccessToken[]> => {
  const result = await queryFn<PersonalAccessTokenRow>(
    `select ${TOKEN_COLUMNS}
     from personal_access_tokens
     where user_id = $1
     order by created_at desc`,
    [userId],
  );
  return result.rows.map(mapRowToToken);
};

export const revokePersonalAccessToken = async (
  userId: string,
  tokenId: string,
  queryFn: QueryFn,
): Promise<boolean> => {
  const result = await queryFn(
    `update personal_access_tokens
     set revoked_at = now()
     where id = $1 and user_id = $2 and revoked_at is null`,
    [tokenId, userId],
  );
  return (result.rowCount ?? 0) > 0;
};

/**
 * Resolve the owning user for a personal access token. Returns null for unknown
 * or revoked tokens. Touches last_used_at on success.
 */
export const resolveUserByPersonalAccessToken = async (
  token: string,
  queryFn: QueryFn,
): Promise<TokenUser | null> => {
  const used = await queryFn<{user_id: string}>(
    `update personal_access_tokens
     set last_used_at = now()
     where token_hash = $1 and revoked_at is null
     returning user_id`,
    [hashToken(token)],
  );
  const tokenRow = used.rows[0];
  if (!tokenRow) {
    return null;
  }
  const user = await queryFn<{id: string; supabase_uid: string; email: string}>(
    'select id, supabase_uid, email from users where id = $1',
    [tokenRow.user_id],
  );
  const userRow = user.rows[0];
  if (!userRow) {
    return null;
  }
  return {
    id: userRow.id,
    supabaseUid: userRow.supabase_uid,
    email: userRow.email,
  };
};

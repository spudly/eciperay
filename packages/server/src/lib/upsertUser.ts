import {query as defaultQuery} from '../db/query.js';

type QueryFn = typeof defaultQuery;

export type UpsertUserOptions = {
  supabaseUid: string;
  email: string;
  displayName: string | null;
};

const UPSERT_USER_SQL = `
  insert into users (id, supabase_uid, email, display_name)
  values ($1, $1, $2, $3)
  on conflict (supabase_uid)
  do update set email        = excluded.email,
                display_name = coalesce(excluded.display_name, users.display_name)
  returning id, supabase_uid, email, display_name, created_at
`;

// The insert sets both `id` and `supabase_uid` from the same value, but
// ON CONFLICT only arbitrates the supabase_uid unique index. When two
// first-login syncs for the same brand-new user run concurrently, the
// losing insert can therefore still fail on the primary key instead
// (users_pkey — issue #157). Postgres only raises that violation once
// the winning transaction has committed, so retrying the upsert once
// resolves through the supabase_uid conflict path and returns the row
// the winning request created.
const isUsersPkeyViolation = (error: unknown): boolean => {
  const pgError = error as {code?: string; constraint?: string};
  return pgError.code === '23505' && pgError.constraint === 'users_pkey';
};

export const upsertUserRecord = async (
  {supabaseUid, email, displayName}: UpsertUserOptions,
  queryFn: QueryFn = defaultQuery,
) => {
  try {
    return await queryFn(UPSERT_USER_SQL, [supabaseUid, email, displayName]);
  } catch (error) {
    if (!isUsersPkeyViolation(error)) {
      throw error;
    }
    return queryFn(UPSERT_USER_SQL, [supabaseUid, email, displayName]);
  }
};

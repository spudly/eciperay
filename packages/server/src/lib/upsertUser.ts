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

export const upsertUserRecord = (
  {supabaseUid, email, displayName}: UpsertUserOptions,
  queryFn: QueryFn = defaultQuery,
) => queryFn(UPSERT_USER_SQL, [supabaseUid, email, displayName]);

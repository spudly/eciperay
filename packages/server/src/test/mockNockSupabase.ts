import nock from 'nock';

/**
 * Registers a nock intercept for `supabase.auth.getUser()`. Reads
 * `SUPABASE_URL` from process.env — never hardcoded. Call in `beforeEach`.
 */
export const nockSupabaseGetUser = (userId: string) => {
  const supabaseUrl =
    process.env['SUPABASE_URL'] ?? 'http://supabase-test.local';
  return nock(supabaseUrl)
    .get('/auth/v1/user')
    .reply(200, {id: userId, email: `${userId}@test.com`});
};

/** Registers a nock intercept that simulates an invalid/expired token. */
export const nockSupabaseGetUserError = () => {
  const supabaseUrl =
    process.env['SUPABASE_URL'] ?? 'http://supabase-test.local';
  return nock(supabaseUrl)
    .get('/auth/v1/user')
    .reply(401, {message: 'Invalid token'});
};

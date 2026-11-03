/**
 * Fixture-client selection (#183 Phase 2): with E2E_FIXTURE_MODE on,
 * lib/api and lib/supabase must wire up the fixture implementations
 * from lib/e2eFixtures — the app answers from seeded data with a stub
 * session, no network and no real Supabase client. The flag-off path
 * (real clients) is covered by api.test.ts and supabase.test.ts, which
 * mock ./env without the flag.
 */
jest.mock('./env', () => ({
  API_BASE_URL: 'http://localhost:8080/api',
  SUPABASE_URL: 'https://fixture.invalid',
  SUPABASE_ANON_KEY: 'fixture-anon-key',
  E2E_FIXTURE_MODE: true,
}));

describe('fixture mode client selection', () => {
  it('api serves the fixture recipes without a backend', async () => {
    const {api} = require('./api') as typeof import('./api');
    const own = await api.recipes.list();
    expect(own.map(recipe => recipe.title)).toEqual([
      'E2E Weeknight Pasta',
      'E2E Garden Salad',
    ]);
    const shared = await api.recipes.listSharedWithMe();
    expect(shared.map(recipe => recipe.title)).toEqual([
      'E2E Shared Tomato Soup',
    ]);
  });

  it('supabase reports the permanent fixture session', async () => {
    const {supabase} = require('./supabase') as typeof import('./supabase');
    const {data, error} = await supabase.auth.getSession();
    expect(error).toBeNull();
    expect(data.session?.access_token).toBe('e2e-fixture-access-token');
    expect(data.session?.user.email).toBe('e2e@eciperay.invalid');
  });
});

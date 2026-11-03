import {createEciperayClient} from '@eciperay/client';

import {
  createFixtureApiClient,
  createFixtureSupabaseClient,
  E2E_FIXTURE_USER_ID,
  E2E_OWN_RECIPES,
  E2E_SHARED_RECIPES,
} from './e2eFixtures';

const api = createEciperayClient(createFixtureApiClient());

describe('e2e fixture API client', () => {
  test('serves the fixture recipes as the signed-in user list', async () => {
    const recipes = await api.recipes.list();
    expect(recipes.map(recipe => recipe.title)).toEqual([
      'E2E Weeknight Pasta',
      'E2E Garden Salad',
    ]);
    expect(recipes.map(recipe => recipe.id)).toEqual(
      E2E_OWN_RECIPES.map(recipe => recipe.id),
    );
  });

  test('serves shared recipes only on the shared-with-me route', async () => {
    const shared = await api.recipes.listSharedWithMe();
    expect(shared.map(recipe => recipe.title)).toEqual([
      'E2E Shared Tomato Soup',
    ]);
    const own = await api.recipes.list();
    expect(own.map(recipe => recipe.id)).not.toContain(
      E2E_SHARED_RECIPES[0].id,
    );
  });

  test('serves a full recipe detail with ingredients and steps', async () => {
    const detail = await api.recipes.get('e2e-recipe-pasta');
    expect(detail.title).toBe('E2E Weeknight Pasta');
    expect(detail.ingredients.map(ingredient => ingredient.name)).toContain(
      'Crushed tomatoes',
    );
    expect(detail.instructions.map(step => step.body)).toContain(
      'Simmer the sauce for 15 minutes.',
    );
    expect(detail.viewerRating).toBeNull();
  });

  test('rejects an unknown recipe id as a 404', async () => {
    await expect(api.recipes.get('no-such-recipe')).rejects.toMatchObject({
      status: 404,
    });
  });

  test('serves the active version summary and empty cook logs', async () => {
    const versions = await api.versions.list('e2e-recipe-pasta');
    expect(versions).toHaveLength(1);
    expect(versions[0].id).toBe('e2e-version-pasta');
    expect(versions[0].derivedRole).toBe('active');
    expect(versions[0].createdAt).toBe('2024-01-01T00:00:00.000Z');
    expect(versions[0].updatedAt).toBe('2024-01-01T00:00:00.000Z');

    await expect(
      api.cookLogs.list('e2e-recipe-pasta', 'e2e-version-pasta'),
    ).resolves.toEqual([]);
  });

  test('serves fixture nutrition for the detail screen query', async () => {
    const nutrition = await api.ai.nutrition('e2e-recipe-pasta');
    expect(nutrition.calories).toBe(620);
    expect(nutrition.status).toBe('ready');
  });

  test('accepts the auth sync the session lifecycle fires on sign-in', async () => {
    await expect(api.auth.syncUser()).resolves.toBeUndefined();
  });

  test('rejects mutations the fixture does not model', async () => {
    await expect(
      createFixtureApiClient().fetch('/recipes', {method: 'POST'}),
    ).rejects.toMatchObject({code: 'e2e_fixture_unhandled'});
  });

  test('settles unlisted GET paths as an empty list', async () => {
    await expect(createFixtureApiClient().fetch('/meals')).resolves.toEqual([]);
  });
});

describe('e2e fixture Supabase client', () => {
  test('reports a permanent fixture session', async () => {
    const supabase = createFixtureSupabaseClient();
    const {data, error} = await supabase.auth.getSession();
    expect(error).toBeNull();
    expect(data.session?.access_token).toBe('e2e-fixture-access-token');
    expect(data.session?.user.id).toBe(E2E_FIXTURE_USER_ID);
  });

  test('auth state subscription is inert and unsubscribable', () => {
    const supabase = createFixtureSupabaseClient();
    const {data} = supabase.auth.onAuthStateChange(jest.fn());
    expect(typeof data.subscription.unsubscribe).toBe('function');
    expect(() => {
      data.subscription.unsubscribe();
    }).not.toThrow();
  });
});

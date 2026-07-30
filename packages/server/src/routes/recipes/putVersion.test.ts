import request from 'supertest';

import {makeRecipeInput} from '../../test/fixtures/recipe.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeVersionDetailRow} from '../../test/fixtures/versionRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {RecipeNotFoundError} from '../../lib/saveRecipeFromInput.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

const draftVersionRow = (
  overrides: Parameters<typeof makeVersionDetailRow>[0] = {},
) =>
  makeVersionDetailRow({
    id: 'version-uuid-2',
    version_id: 'version-uuid-2',
    version_number: 2,
    active_version_id: 'version-uuid-1',
    active_version_number: 1,
    cook_log_count: 0,
    ...overrides,
  });

const mockPutVersionQueries = (
  options: {
    finalVersionRow?: ReturnType<typeof makeVersionDetailRow> | null;
    finalTitle?: string;
  } = {},
) => {
  let versionFetches = 0;
  mockQuery.mockImplementation(((sql: string) => {
    if (sql.includes('cook_log_count')) {
      versionFetches += 1;
      if (options.finalVersionRow === null && versionFetches > 1) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (versionFetches > 1) {
        return Promise.resolve(
          makeQueryResult([
            options.finalVersionRow ??
              draftVersionRow({title: options.finalTitle ?? 'Updated Draft'}),
          ]),
        );
      }
      return Promise.resolve(makeQueryResult([draftVersionRow()]));
    }
    if (sql.includes('update recipe_versions')) {
      return Promise.resolve({
        ...makeQueryResult([{id: 'version-uuid-2'}]),
        rowCount: 1,
      });
    }
    if (sql.includes('from recipes r')) {
      return Promise.resolve(makeQueryResult([makeRecipeDetailRow()]));
    }
    return Promise.resolve(makeQueryResult([]));
  }) as typeof mockQuery);
};

describe('PUT /recipes/:id/versions/:versionId', () => {
  test('returns 200 with updated draft version', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockPutVersionQueries();

    const res = await request(getApp())
      .put('/api/recipes/recipe-uuid-1/versions/version-uuid-2')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput({title: 'Updated Draft'}));

    expect(res.status).toBe(200);
    expect(res.body.derivedRole).toBe('draft');
    expect(res.body.versionNumber).toBe(2);
  });

  test('returns 404 when version is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const res = await request(getApp())
      .put('/api/recipes/recipe-uuid-1/versions/missing-version')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput());

    expect(res.status).toBe(404);
  });

  test('returns 409 when version is not a draft', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([makeVersionDetailRow()]));

    const res = await request(getApp())
      .put('/api/recipes/recipe-uuid-1/versions/version-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput());

    expect(res.status).toBe(409);
  });

  test('returns 404 when save fails with RecipeNotFoundError', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('cook_log_count')) {
        return Promise.resolve(makeQueryResult([draftVersionRow()]));
      }
      if (sql.includes('update recipe_versions')) {
        return Promise.resolve({...makeQueryResult([]), rowCount: 0});
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    const res = await request(getApp())
      .put('/api/recipes/recipe-uuid-1/versions/version-uuid-2')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput());

    expect(res.status).toBe(404);
  });

  test('propagates unexpected save errors', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('cook_log_count')) {
        return Promise.resolve(makeQueryResult([draftVersionRow()]));
      }
      if (sql.includes('update recipe_versions')) {
        return Promise.reject(new Error('db down'));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    await expect(
      request(getApp())
        .put('/api/recipes/recipe-uuid-1/versions/version-uuid-2')
        .set('Authorization', 'Bearer valid-token')
        .send(makeRecipeInput()),
    ).resolves.toMatchObject({status: 500});
  });

  test('returns 500 when updated version cannot be fetched', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockPutVersionQueries({finalVersionRow: null});

    const res = await request(getApp())
      .put('/api/recipes/recipe-uuid-1/versions/version-uuid-2')
      .set('Authorization', 'Bearer valid-token')
      .send(makeRecipeInput());

    expect(res.status).toBe(500);
  });

  test('returns 400 when body is invalid', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .put('/api/recipes/recipe-uuid-1/versions/version-uuid-2')
      .set('Authorization', 'Bearer valid-token')
      .send({title: ''});
    expect(res.status).toBe(400);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp())
      .put('/api/recipes/recipe-uuid-1/versions/version-uuid-2')
      .send(makeRecipeInput());
    expect(res.status).toBe(401);
  });
});

describe('RecipeNotFoundError', () => {
  test('has the expected name', () => {
    expect(new RecipeNotFoundError().name).toBe('RecipeNotFoundError');
  });
});

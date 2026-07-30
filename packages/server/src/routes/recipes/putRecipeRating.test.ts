import nock from 'nock';
import request from 'supertest';

import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

const recipeRow = makeRecipeDetailRow({
  user_id: 'owner-uuid',
  visibility: 'public',
});

const mockReadableRecipeQueries = () => {
  mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
    if (sql.includes('recipe_ratings rr')) {
      return Promise.resolve(makeQueryResult([]));
    }
    if (sql.includes('update recipes') && sql.includes('star_rating')) {
      return Promise.resolve({
        ...makeQueryResult([{id: 'recipe-uuid-1'}]),
        rowCount: 1,
      });
    }
    if (sql.includes('insert into recipe_ratings')) {
      return Promise.resolve(makeQueryResult([]));
    }
    if (sql.includes('delete from recipe_ratings')) {
      return Promise.resolve(makeQueryResult([]));
    }
    if (params?.[0] === 'recipe-uuid-1') {
      return Promise.resolve(makeQueryResult([recipeRow]));
    }
    return Promise.resolve(makeQueryResult([]));
  }) as typeof mockQuery);
};

describe('PUT /recipes/:id/rating', () => {
  beforeEach(() => {
    nock.cleanAll();
    mockQuery.mockReset();
    nockSupabaseGetUser('owner-uuid');
    mockReadableRecipeQueries();
  });

  test('updates owner personal star rating', async () => {
    const res = await request(getApp())
      .put('/api/recipes/recipe-uuid-1/rating')
      .set('Authorization', 'Bearer valid-token')
      .send({stars: 5});

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('star_rating'),
      ['recipe-uuid-1', 'owner-uuid', 5],
    );
  });

  test('returns 404 when recipe is not readable', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(getApp())
      .put('/api/recipes/missing-id/rating')
      .set('Authorization', 'Bearer valid-token')
      .send({stars: 5});
    expect(res.status).toBe(404);
  });

  test('returns 404 when owner rating update misses', async () => {
    mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
      if (sql.includes('update recipes') && sql.includes('star_rating')) {
        return Promise.resolve({...makeQueryResult([]), rowCount: 0});
      }
      if (params?.[0] === 'recipe-uuid-1') {
        return Promise.resolve(makeQueryResult([recipeRow]));
      }
      if (sql.includes('recipe_ratings rr')) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    const res = await request(getApp())
      .put('/api/recipes/recipe-uuid-1/rating')
      .set('Authorization', 'Bearer valid-token')
      .send({stars: 5});

    expect(res.status).toBe(404);
  });

  test('returns 400 for invalid stars', async () => {
    const res = await request(getApp())
      .put('/api/recipes/recipe-uuid-1/rating')
      .set('Authorization', 'Bearer valid-token')
      .send({stars: 6});

    expect(res.status).toBe(400);
  });

  test('upserts a community rating for a non-owner', async () => {
    nock.cleanAll();
    nockSupabaseGetUser('viewer-uuid');
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('recipe_ratings rr')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (sql.includes('insert into recipe_ratings')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (sql.includes('recipe_share_grants')) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([recipeRow]));
    }) as typeof mockQuery);

    const res = await request(getApp())
      .put('/api/recipes/recipe-uuid-1/rating')
      .set('Authorization', 'Bearer valid-token')
      .send({stars: 4});

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      'recipe-uuid-1',
      'viewer-uuid',
      4,
      1,
    ]);
  });
});

describe('DELETE /recipes/:id/rating', () => {
  beforeEach(() => {
    nock.cleanAll();
    mockQuery.mockReset();
    nockSupabaseGetUser('owner-uuid');
    mockReadableRecipeQueries();
  });

  test('clears owner personal star rating', async () => {
    const res = await request(getApp())
      .delete('/api/recipes/recipe-uuid-1/rating')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('star_rating'),
      ['recipe-uuid-1', 'owner-uuid', null],
    );
  });

  test('returns 404 when owner rating delete misses', async () => {
    mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
      if (sql.includes('update recipes') && sql.includes('star_rating')) {
        return Promise.resolve({...makeQueryResult([]), rowCount: 0});
      }
      if (params?.[0] === 'recipe-uuid-1') {
        return Promise.resolve(makeQueryResult([recipeRow]));
      }
      if (sql.includes('recipe_ratings rr')) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    const res = await request(getApp())
      .delete('/api/recipes/recipe-uuid-1/rating')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  test('returns 404 when recipe is not readable', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(getApp())
      .delete('/api/recipes/missing-id/rating')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
  });

  test('deletes a community rating for a non-owner', async () => {
    nock.cleanAll();
    nockSupabaseGetUser('viewer-uuid');
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('recipe_ratings rr')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (sql.includes('delete from recipe_ratings')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (sql.includes('recipe_share_grants')) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([recipeRow]));
    }) as typeof mockQuery);

    const res = await request(getApp())
      .delete('/api/recipes/recipe-uuid-1/rating')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      'recipe-uuid-1',
      'viewer-uuid',
    ]);
  });
});

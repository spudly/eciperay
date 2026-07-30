import nock from 'nock';
import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

const recipeRow = makeRecipeDetailRow({
  user_id: 'owner-uuid',
  visibility: 'public',
});

describe('DELETE /recipes/:id/comments/:commentId', () => {
  beforeEach(() => {
    nock.cleanAll();
    mockQuery.mockReset();
    nockSupabaseGetUser('viewer-uuid');
  });

  test('deletes a comment by its author', async () => {
    mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
      if (
        sql.includes('delete from recipe_comments') &&
        sql.includes('user_id')
      ) {
        return Promise.resolve({
          ...makeQueryResult([{id: 'comment-uuid-1'}]),
          rowCount: 1,
        });
      }
      if (params?.[0] === 'recipe-uuid-1') {
        return Promise.resolve(makeQueryResult([recipeRow]));
      }
      if (sql.includes('recipe_share_grants')) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    const res = await request(getApp())
      .delete('/api/recipes/recipe-uuid-1/comments/comment-uuid-1')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(204);
  });

  test('allows the recipe owner to delete any comment', async () => {
    nock.cleanAll();
    nockSupabaseGetUser('owner-uuid');
    mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
      if (
        sql.includes('delete from recipe_comments') &&
        !sql.includes('user_id')
      ) {
        return Promise.resolve({
          ...makeQueryResult([{id: 'comment-uuid-1'}]),
          rowCount: 1,
        });
      }
      if (params?.[0] === 'recipe-uuid-1') {
        return Promise.resolve(makeQueryResult([recipeRow]));
      }
      if (sql.includes('recipe_share_grants')) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    const res = await request(getApp())
      .delete('/api/recipes/recipe-uuid-1/comments/comment-uuid-1')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(204);
  });

  test('returns 404 when comment is not found', async () => {
    mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
      if (sql.includes('delete from recipe_comments')) {
        return Promise.resolve({...makeQueryResult([]), rowCount: 0});
      }
      if (params?.[0] === 'recipe-uuid-1') {
        return Promise.resolve(makeQueryResult([recipeRow]));
      }
      if (sql.includes('recipe_share_grants')) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    const res = await request(getApp())
      .delete('/api/recipes/recipe-uuid-1/comments/missing-comment')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  test('returns 404 when recipe is not readable', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(getApp())
      .delete('/api/recipes/missing-id/comments/comment-uuid-1')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
  });
});

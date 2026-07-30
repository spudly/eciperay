import {jest} from '@jest/globals';
import nock from 'nock';
import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

import {
  listRecipeCommentsForReadableRecipe,
  mapRecipeComments,
  respondWithRecipeComments,
} from './listRecipeComments.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

const recipeRow = makeRecipeDetailRow({
  user_id: 'owner-uuid',
  visibility: 'public',
  content_revision: 3,
});

const commentRow = {
  id: 'comment-uuid-1',
  recipe_id: 'recipe-uuid-1',
  user_id: 'viewer-uuid',
  author_display_name: 'Alex',
  body: 'Delicious!',
  content_revision: 2,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-02T00:00:00.000Z',
};

describe('listRecipeComments helpers', () => {
  test('mapRecipeComments marks stale comments', () => {
    expect(mapRecipeComments([commentRow], 3)).toEqual([
      expect.objectContaining({isStale: true, body: 'Delicious!'}),
    ]);
  });

  test('returns null when the recipe is unreadable', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const comments = await listRecipeCommentsForReadableRecipe(
      'recipe-uuid-1',
      'viewer-uuid',
      mockQuery,
    );
    expect(comments).toBeNull();
  });

  test('respondWithRecipeComments returns 404 when unreadable', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = {status: jest.fn().mockReturnThis(), json: jest.fn()};
    await respondWithRecipeComments(
      'recipe-uuid-1',
      'viewer-uuid',
      res as never,
      mockQuery,
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('GET /recipes/:id/comments', () => {
  beforeEach(() => {
    nock.cleanAll();
    mockQuery.mockReset();
    nockSupabaseGetUser('viewer-uuid');
  });

  test('returns comments for readable recipes', async () => {
    mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
      if (sql.includes('recipe_comments')) {
        return Promise.resolve(makeQueryResult([commentRow]));
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
      .get('/api/recipes/recipe-uuid-1/comments')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toEqual(
      expect.objectContaining({
        id: 'comment-uuid-1',
        body: 'Delicious!',
        isStale: true,
      }),
    );
  });

  test('returns 404 when recipe is not readable', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(getApp())
      .get('/api/recipes/missing-id/comments')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
  });
});

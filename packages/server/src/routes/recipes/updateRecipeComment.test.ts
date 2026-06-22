import nock from 'nock';
import request from 'supertest';

import {createApp} from '../../server.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

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
  body: 'Updated comment',
  content_revision: 2,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-02T00:00:00.000Z',
};

describe('PUT /recipes/:id/comments/:commentId', () => {
  beforeEach(() => {
    nock.cleanAll();
    mockQuery.mockReset();
    nockSupabaseGetUser('viewer-uuid');
  });

  test('updates a comment by its author', async () => {
    mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
      if (sql.includes('update recipe_comments')) {
        return Promise.resolve({
          ...makeQueryResult([{id: 'comment-uuid-1'}]),
          rowCount: 1,
        });
      }
      if (sql.includes('recipe_comments') && sql.includes('select')) {
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

    const res = await request(app)
      .put('/api/recipes/recipe-uuid-1/comments/comment-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send({body: 'Updated comment'});

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({body: 'Updated comment', isStale: true}),
    );
  });

  test('returns 400 for invalid body', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([recipeRow]));
    const res = await request(app)
      .put('/api/recipes/recipe-uuid-1/comments/comment-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send({body: ''});
    expect(res.status).toBe(400);
  });

  test('returns 404 when updated comment cannot be loaded', async () => {
    mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
      if (sql.includes('update recipe_comments')) {
        return Promise.resolve({
          ...makeQueryResult([{id: 'comment-uuid-1'}]),
          rowCount: 1,
        });
      }
      if (sql.includes('recipe_comments') && sql.includes('select')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (params?.[0] === 'recipe-uuid-1') {
        return Promise.resolve(makeQueryResult([recipeRow]));
      }
      if (sql.includes('recipe_share_grants')) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    const res = await request(app)
      .put('/api/recipes/recipe-uuid-1/comments/comment-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send({body: 'Updated comment'});

    expect(res.status).toBe(404);
  });

  test('returns 404 when comment is not found', async () => {
    mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
      if (sql.includes('update recipe_comments')) {
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

    const res = await request(app)
      .put('/api/recipes/recipe-uuid-1/comments/missing-comment')
      .set('Authorization', 'Bearer valid-token')
      .send({body: 'Updated comment'});

    expect(res.status).toBe(404);
  });

  test('returns 404 when recipe is not readable', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(app)
      .put('/api/recipes/missing-id/comments/comment-uuid-1')
      .set('Authorization', 'Bearer valid-token')
      .send({body: 'Updated comment'});
    expect(res.status).toBe(404);
  });
});

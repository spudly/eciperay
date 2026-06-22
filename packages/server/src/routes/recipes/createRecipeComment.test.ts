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
  content_revision: 2,
});

const commentRow = {
  id: 'comment-uuid-1',
  recipe_id: 'recipe-uuid-1',
  user_id: 'viewer-uuid',
  author_display_name: 'Alex',
  body: 'Great recipe!',
  content_revision: 2,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

describe('POST /recipes/:id/comments', () => {
  beforeEach(() => {
    nock.cleanAll();
    mockQuery.mockReset();
    nockSupabaseGetUser('viewer-uuid');
  });

  test('creates a comment on a readable recipe', async () => {
    mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
      if (sql.includes('insert into recipe_comments')) {
        return Promise.resolve(makeQueryResult([{id: 'comment-uuid-1'}]));
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
      .post('/api/recipes/recipe-uuid-1/comments')
      .set('Authorization', 'Bearer valid-token')
      .send({body: 'Great recipe!'});

    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        id: 'comment-uuid-1',
        body: 'Great recipe!',
        contentRevision: 2,
        isStale: false,
      }),
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('insert into recipe_comments'),
      ['recipe-uuid-1', 'viewer-uuid', 'Great recipe!', 2],
    );
  });

  test('returns 404 when recipe is not readable', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(app)
      .post('/api/recipes/missing-id/comments')
      .set('Authorization', 'Bearer valid-token')
      .send({body: 'Hello'});
    expect(res.status).toBe(404);
  });

  test('returns 400 for invalid body', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([recipeRow]));
    const res = await request(app)
      .post('/api/recipes/recipe-uuid-1/comments')
      .set('Authorization', 'Bearer valid-token')
      .send({body: ''});
    expect(res.status).toBe(400);
  });

  test('returns 500 when insert does not return an id', async () => {
    mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
      if (sql.includes('insert into recipe_comments')) {
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
      .post('/api/recipes/recipe-uuid-1/comments')
      .set('Authorization', 'Bearer valid-token')
      .send({body: 'Great recipe!'});

    expect(res.status).toBe(500);
  });

  test('returns 500 when the created comment cannot be loaded', async () => {
    mockQuery.mockImplementation(((sql: string, params?: unknown[]) => {
      if (sql.includes('insert into recipe_comments')) {
        return Promise.resolve(makeQueryResult([{id: 'comment-uuid-1'}]));
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
      .post('/api/recipes/recipe-uuid-1/comments')
      .set('Authorization', 'Bearer valid-token')
      .send({body: 'Great recipe!'});

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/load comment/i);
  });
});

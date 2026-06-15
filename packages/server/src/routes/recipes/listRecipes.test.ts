import request from 'supertest';

import {createApp} from '../../server.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

describe('GET /recipes', () => {
  test('returns 200 with recipe list', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {
          id: 'recipe-uuid-1',
          title: 'Test Recipe',
          description: 'A test recipe',
          servings: 4,
          prep_time_min: 15,
          cook_time_min: 30,
          image_url: null,
          star_rating: null,
          source_url: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          tags: [],
        },
      ]),
    );
    const res = await request(app)
      .get('/recipes')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      title: 'Test Recipe',
      imageUrl: null,
      cookTimeMin: 30,
    });
  });

  test('passes limit and offset query params', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(app)
      .get('/recipes?limit=500&offset=40')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      'user-uuid-1',
      500,
      40,
    ]);
  });

  test('caps limit at 500', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    await request(app)
      .get('/recipes?limit=9999')
      .set('Authorization', 'Bearer valid-token');
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      'user-uuid-1',
      500,
      0,
    ]);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app).get('/recipes');
    expect(res.status).toBe(401);
  });

  test('returns 401 when token is invalid', async () => {
    const {nockSupabaseGetUserError} =
      await import('../../test/mockNockSupabase.js');
    nockSupabaseGetUserError();
    const res = await request(app)
      .get('/recipes')
      .set('Authorization', 'Bearer bad-token');
    expect(res.status).toBe(401);
  });
});

import request from 'supertest';

import {createApp} from '../../server.js';
import {makeRecipe} from '../../test/fixtures/recipe.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

describe('GET /recipes', () => {
  test('returns 200 with recipe list', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([makeRecipe()]));
    const res = await request(app)
      .get('/recipes')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
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

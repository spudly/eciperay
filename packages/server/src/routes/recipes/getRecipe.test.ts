import request from 'supertest';

import {createApp} from '../../server.js';
import {makeRecipeDetail} from '../../test/fixtures/recipe.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

describe('GET /recipes/:id', () => {
  test('returns 200 with recipe detail when found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('recipe_ratings rr')) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([makeRecipeDetailRow()]));
    }) as typeof mockQuery);
    const res = await request(app)
      .get('/api/recipes/recipe-uuid-1')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ...makeRecipeDetail(),
      communityRating: null,
      viewerRating: null,
      viewerRatingIsStale: false,
    });
  });

  test('returns 404 when recipe is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(app)
      .get('/api/recipes/missing-id')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({error: 'Recipe not found'});
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/recipes/recipe-uuid-1');
    expect(res.status).toBe(401);
  });
});

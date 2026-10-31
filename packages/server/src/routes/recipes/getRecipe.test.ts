import request from 'supertest';

import {makeRecipeDetail} from '../../test/fixtures/recipe.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

describe('GET /recipes/:id', () => {
  test('returns 200 with recipe detail when found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('recipe_ratings rr')) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([makeRecipeDetailRow()]));
    }) as typeof mockQuery);
    const res = await request(getApp())
      .get('/api/recipes/11111111-1111-4111-8111-111111111111')
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
    const res = await request(getApp())
      .get('/api/recipes/22222222-2222-4222-8222-222222222222')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({error: 'Recipe not found'});
  });

  test('returns 404 for the literal "public" segment without querying the database', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .get('/api/recipes/public')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({error: 'Recipe not found'});
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('returns 404 for a non-UUID id without querying the database', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .get('/api/recipes/not-a-uuid')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({error: 'Recipe not found'});
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp()).get(
      '/api/recipes/11111111-1111-4111-8111-111111111111',
    );
    expect(res.status).toBe(401);
  });
});

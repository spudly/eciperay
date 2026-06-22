import request from 'supertest';

import {createApp} from '../../server.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';

const mockQuery = createMockQuery();
const app = createApp({query: mockQuery});

describe('createPublicRecipesRouter', () => {
  test('registers GET /:id and GET /:id/:slug on /api/public/recipes', async () => {
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('recipe_ratings rr')) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(
        makeQueryResult([makeRecipeDetailRow({visibility: 'public'})]),
      );
    }) as typeof mockQuery);

    const byId = await request(app).get('/api/public/recipes/recipe-uuid-1');
    const bySlug = await request(app).get(
      '/api/public/recipes/recipe-uuid-1/pasta',
    );

    expect(byId.status).toBe(200);
    expect(bySlug.status).toBe(200);
    expect(mockQuery.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

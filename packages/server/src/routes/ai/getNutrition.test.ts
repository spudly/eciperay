import request from 'supertest';

import {makeIngredient} from '../../test/fixtures/ingredient.js';
import {makeRecipeDetail} from '../../test/fixtures/recipe.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockAnthropicMessage} from '../../test/mockNockAnthropic.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

const NUTRITION_RESPONSE = JSON.stringify({
  calories: 350,
  proteinG: 12,
  carbsG: 45,
  fatG: 10,
  fiberG: 3,
  sugarG: 2,
  sodiumMg: 400,
  disclaimer: 'AI-estimated values.',
});

describe('GET /recipes/:id/ai/nutrition', () => {
  test('returns nutrition info with servings', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(NUTRITION_RESPONSE);
    mockQuery.mockResolvedValue(makeQueryResult([makeRecipeDetail()]));
    const res = await request(getApp())
      .get('/api/recipes/recipe-uuid-1/ai/nutrition')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body.calories).toBe(350);
    expect(res.body).toHaveProperty('servings');
  });

  test('returns 404 when recipe is not found', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = await request(getApp())
      .get('/api/recipes/missing/ai/nutrition')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp()).get('/api/recipes/r/ai/nutrition');
    expect(res.status).toBe(401);
  });

  test('handles ingredients with null quantity and unit', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage(NUTRITION_RESPONSE);
    const detail = makeRecipeDetail({
      ingredients: [makeIngredient({quantity: null, unit: null, name: 'salt'})],
    });
    mockQuery.mockResolvedValue(makeQueryResult([detail]));
    const res = await request(getApp())
      .get('/api/recipes/recipe-uuid-1/ai/nutrition')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
  });
});

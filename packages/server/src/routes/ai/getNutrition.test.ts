import request from 'supertest';

import {makeIngredient} from '../../test/fixtures/ingredient.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockAnthropicMessage} from '../../test/mockNockAnthropic.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';
import {mockBillingPlan} from '../../test/mockBilling.js';

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
  preparedWeightG: 800,
  disclaimer: 'AI-estimated values.',
});

const readyNutritionRow = {
  version_id: 'version-uuid-1',
  recipe_id: 'recipe-uuid-1',
  servings: 4,
  title: 'Test Recipe',
  calories: 350,
  protein_g: 12,
  carbs_g: 45,
  fat_g: 10,
  fiber_g: 3,
  sugar_g: 2,
  sodium_mg: 400,
  prepared_weight_g: 800,
  satiety_score: 55,
  nutrition_status: 'ready',
  nutrition_disclaimer: 'AI-estimated values.',
  nutrition_updated_at: '2024-01-01T00:00:00.000Z',
};

const pendingNutritionRow = {
  ...readyNutritionRow,
  nutrition_status: null,
  calories: null,
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  prepared_weight_g: null,
  satiety_score: null,
};

describe('GET /recipes/:id/ai/nutrition', () => {
  test('returns stored nutrition when ready', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([readyNutritionRow]));
    const res = await request(getApp())
      .get('/api/recipes/recipe-uuid-1/ai/nutrition')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      calories: 350,
      preparedWeightG: 800,
      satietyScore: 55,
      servings: 4,
      status: 'ready',
    });
  });

  test('estimates and stores nutrition when missing', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    nockAnthropicMessage(NUTRITION_RESPONSE);
    mockQuery
      // fetchRecipeDetail
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      // getNutrition stored check
      .mockResolvedValueOnce(makeQueryResult([pendingNutritionRow]))
      .mockResolvedValueOnce(makeQueryResult([{calls: 1}]))
      // refresh: fetchVersionNutrition
      .mockResolvedValueOnce(makeQueryResult([pendingNutritionRow]))
      // mark pending
      .mockResolvedValueOnce(makeQueryResult([]))
      // ingredients
      .mockResolvedValueOnce(
        makeQueryResult([{name: 'Flour', quantity: 2, unit: 'cups'}]),
      )
      // update nutrition
      .mockResolvedValueOnce(makeQueryResult([]))
      // final fetch
      .mockResolvedValueOnce(makeQueryResult([readyNutritionRow]));
    const res = await request(getApp())
      .get('/api/recipes/recipe-uuid-1/ai/nutrition')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body.calories).toBe(350);
    expect(res.body).toHaveProperty('preparedWeightG');
    expect(res.body).toHaveProperty('satietyScore');
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

  test('returns 404 when force refresh cannot load the version', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([{calls: 1}]))
      .mockResolvedValueOnce(makeQueryResult([]));
    const res = await request(getApp())
      .get('/api/recipes/recipe-uuid-1/ai/nutrition?refresh=true')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(404);
  });

  test('estimates when stored nutrition row is missing', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    nockAnthropicMessage(NUTRITION_RESPONSE);
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      // stored lookup returns no row
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([{calls: 1}]))
      // refreshRecipeNutrition
      .mockResolvedValueOnce(makeQueryResult([pendingNutritionRow]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(
        makeQueryResult([{name: 'Flour', quantity: 2, unit: 'cups'}]),
      )
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([readyNutritionRow]));
    const res = await request(getApp())
      .get('/api/recipes/recipe-uuid-1/ai/nutrition')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body.calories).toBe(350);
  });

  test('accepts refresh=1 as a force-refresh flag', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    nockAnthropicMessage(NUTRITION_RESPONSE);
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([{calls: 1}]))
      .mockResolvedValueOnce(makeQueryResult([pendingNutritionRow]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(
        makeQueryResult([{name: 'Flour', quantity: 2, unit: 'cups'}]),
      )
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([readyNutritionRow]));
    const res = await request(getApp())
      .get('/api/recipes/recipe-uuid-1/ai/nutrition?refresh=1')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
  });

  test('returns 502 when nutrition estimation fails', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([pendingNutritionRow]))
      .mockResolvedValueOnce(makeQueryResult([{calls: 1}]))
      .mockResolvedValueOnce(makeQueryResult([pendingNutritionRow]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValue(makeQueryResult([]));
    const res = await request(getApp())
      .get('/api/recipes/recipe-uuid-1/ai/nutrition')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(502);
  });

  test('handles ingredients with null quantity and unit', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    nockAnthropicMessage(NUTRITION_RESPONSE);
    const detail = makeRecipeDetailRow({
      ingredients: [makeIngredient({quantity: null, unit: null, name: 'salt'})],
    });
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([detail]))
      .mockResolvedValueOnce(makeQueryResult([pendingNutritionRow]))
      .mockResolvedValueOnce(makeQueryResult([{calls: 1}]))
      .mockResolvedValueOnce(makeQueryResult([pendingNutritionRow]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(
        makeQueryResult([{name: 'salt', quantity: null, unit: null}]),
      )
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([readyNutritionRow]));
    const res = await request(getApp())
      .get('/api/recipes/recipe-uuid-1/ai/nutrition')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
  });
});

describe('AI quota 402', () => {
  test('402s when AI quota is exhausted', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, null);
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([pendingNutritionRow]))
      .mockResolvedValueOnce(makeQueryResult([{calls: 999}]));

    const res = await request(getApp())
      .get('/api/recipes/recipe-uuid-1/ai/nutrition')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(402);
    expect(res.body.error).toBe('ai_quota_exhausted');
  });
});

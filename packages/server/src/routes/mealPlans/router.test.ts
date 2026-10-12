import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {
  mealPlanRow,
  accessibleRecipeRow,
} from '../../test/fixtures/mealQueryRows.js';
import {
  emptyShareGrant,
  installLoadMealPlanDetailRecipeMock,
  mealPlanInput,
  PLAN_ID,
  RECIPE_ID,
} from '../../test/mealQueryMock.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';
import {mockBillingPlan} from '../../test/mockBilling.js';

import {createMealPlansRouter} from './router.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

describe('createMealPlansRouter', () => {
  test('exports meal plan routes on app', () => {
    expect(createMealPlansRouter(mockQuery)).toBeDefined();
  });
});

describe('GET /meal-plans', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('returns empty list', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .get('/api/meal-plans')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns 401 without auth', async () => {
    const res = await request(getApp()).get('/api/meal-plans');
    expect(res.status).toBe(401);
  });
});

describe('GET /meal-plans/:id', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('returns plan detail', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    installLoadMealPlanDetailRecipeMock(mockQuery);

    const res = await request(getApp())
      .get(`/api/meal-plans/${PLAN_ID}`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('This week');
  });

  test('returns 404 when plan missing', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .get(`/api/meal-plans/${PLAN_ID}`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });
});

describe('POST /meal-plans', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('creates meal plan', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockImplementation((async (sql: string) => {
      if (sql.includes('from recipes r')) {
        return makeQueryResult([accessibleRecipeRow]);
      }
      if (sql.includes('share_grants')) {
        return emptyShareGrant;
      }
      if (sql.includes('insert into meal_plans')) {
        return makeQueryResult([{id: PLAN_ID}]);
      }
      if (sql.includes('insert into meal_plan_entries')) {
        return makeQueryResult([]);
      }
      if (sql.includes('from meal_plans') && sql.includes('where id =')) {
        return makeQueryResult([mealPlanRow]);
      }
      if (sql.includes('from meal_plan_entries')) {
        return makeQueryResult([
          {
            id: 'entry-1',
            meal_plan_id: PLAN_ID,
            sort_order: 0,
            quantity: 1,
            meal_id: null,
            recipe_id: RECIPE_ID,
            servings: 4,
          },
        ]);
      }
      if (sql.includes('goal_calories')) {
        return makeQueryResult([
          {
            goal_calories: null,
            goal_protein_g: null,
            goal_carbs_g: null,
            goal_fat_g: null,
            goal_satiety_score: null,
          },
        ]);
      }
      return makeQueryResult([]);
    }) as typeof mockQuery);

    const res = await request(getApp())
      .post('/api/meal-plans')
      .set('Authorization', 'Bearer valid-token')
      .send(mealPlanInput);

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(PLAN_ID);
  });

  test('returns 400 for invalid body', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    const res = await request(getApp())
      .post('/api/meal-plans')
      .set('Authorization', 'Bearer valid-token')
      .send({title: ''});

    expect(res.status).toBe(400);
  });

  test('returns 400 when recipe is inaccessible', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(emptyShareGrant);

    const res = await request(getApp())
      .post('/api/meal-plans')
      .set('Authorization', 'Bearer valid-token')
      .send(mealPlanInput);

    expect(res.status).toBe(400);
  });
});

describe('PUT /meal-plans/:id', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('updates meal plan', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockImplementation((async (sql: string) => {
      if (sql.includes('select id from meal_plans where id')) {
        return makeQueryResult([{id: PLAN_ID}]);
      }
      if (sql.includes('from recipes r')) {
        return makeQueryResult([accessibleRecipeRow]);
      }
      if (sql.includes('share_grants')) {
        return emptyShareGrant;
      }
      if (
        sql.includes('update meal_plans') ||
        sql.includes('delete from meal_plan_entries') ||
        sql.includes('insert into meal_plan_entries')
      ) {
        return makeQueryResult([]);
      }
      if (sql.includes('from meal_plans') && sql.includes('where id =')) {
        return makeQueryResult([mealPlanRow]);
      }
      if (sql.includes('from meal_plan_entries')) {
        return makeQueryResult([
          {
            id: 'entry-1',
            meal_plan_id: PLAN_ID,
            sort_order: 0,
            quantity: 1,
            meal_id: null,
            recipe_id: RECIPE_ID,
            servings: 4,
          },
        ]);
      }
      if (sql.includes('goal_calories')) {
        return makeQueryResult([
          {
            goal_calories: null,
            goal_protein_g: null,
            goal_carbs_g: null,
            goal_fat_g: null,
            goal_satiety_score: null,
          },
        ]);
      }
      return makeQueryResult([]);
    }) as typeof mockQuery);

    const res = await request(getApp())
      .put(`/api/meal-plans/${PLAN_ID}`)
      .set('Authorization', 'Bearer valid-token')
      .send(mealPlanInput);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(PLAN_ID);
  });

  test('returns 400 for invalid body', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    const res = await request(getApp())
      .put(`/api/meal-plans/${PLAN_ID}`)
      .set('Authorization', 'Bearer valid-token')
      .send({title: ''});

    expect(res.status).toBe(400);
  });

  test('returns 404 when plan missing', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .put(`/api/meal-plans/${PLAN_ID}`)
      .set('Authorization', 'Bearer valid-token')
      .send(mealPlanInput);

    expect(res.status).toBe(404);
  });

  test('returns 400 when entry validation fails', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: PLAN_ID}]))
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce(emptyShareGrant);

    const res = await request(getApp())
      .put(`/api/meal-plans/${PLAN_ID}`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        title: 'Week',
        entries: [{recipeId: RECIPE_ID}, {recipeId: RECIPE_ID}],
      });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /meal-plans/:id', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('deletes meal plan', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce({...makeQueryResult([]), rowCount: 1});

    const res = await request(getApp())
      .delete(`/api/meal-plans/${PLAN_ID}`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(204);
  });

  test('returns 404 when plan missing', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce({...makeQueryResult([]), rowCount: 0});

    const res = await request(getApp())
      .delete(`/api/meal-plans/${PLAN_ID}`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });
});

describe('GET /meal-plans/:id/shopping-list', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('returns shopping list lines', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    installLoadMealPlanDetailRecipeMock(mockQuery);
    mockQuery.mockImplementation((async (sql: string) => {
      if (sql.includes('from meal_plans') && sql.includes('where id =')) {
        return makeQueryResult([mealPlanRow]);
      }
      if (sql.includes('from meal_plan_entries')) {
        return makeQueryResult([
          {
            id: 'entry-1',
            meal_plan_id: PLAN_ID,
            sort_order: 0,
            quantity: 1,
            meal_id: null,
            recipe_id: RECIPE_ID,
            servings: 4,
          },
        ]);
      }
      if (sql.includes('from recipes r')) {
        return makeQueryResult([accessibleRecipeRow]);
      }
      if (sql.includes('share_grants')) {
        return emptyShareGrant;
      }
      if (sql.includes('goal_calories')) {
        return makeQueryResult([
          {
            goal_calories: null,
            goal_protein_g: null,
            goal_carbs_g: null,
            goal_fat_g: null,
            goal_satiety_score: null,
          },
        ]);
      }
      if (sql.includes('from ingredients')) {
        return makeQueryResult([
          {name: 'Flour', quantity: 2, unit: 'cups', is_optional: false},
        ]);
      }
      return makeQueryResult([]);
    }) as typeof mockQuery);

    const res = await request(getApp())
      .get(`/api/meal-plans/${PLAN_ID}/shopping-list`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body[0]?.name).toBe('Flour');
  });

  test('returns 404 when plan missing', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .get(`/api/meal-plans/${PLAN_ID}/shopping-list`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });
});


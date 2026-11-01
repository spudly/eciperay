import request from 'supertest';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {
  emptyShareGrant,
  installLoadMealDetailMock,
  MEAL_ID,
  mealInput,
  RECIPE_ID,
} from '../../test/mealQueryMock.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';
import {mockBillingPlan} from '../../test/mockBilling.js';
import {
  accessibleRecipeRow,
  mealRecipeRow,
  mealRow,
} from '../../test/fixtures/mealQueryRows.js';

import {createMealsRouter} from './router.js';

const mockQuery = createMockQuery();
const getApp = lazyTestApp({query: mockQuery});

describe('createMealsRouter', () => {
  test('exports meal routes on app', () => {
    expect(createMealsRouter(mockQuery)).toBeDefined();
  });
});

describe('GET /meals', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('returns empty list', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .get('/api/meals')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns 401 without auth', async () => {
    const res = await request(getApp()).get('/api/meals');
    expect(res.status).toBe(401);
  });
});

describe('GET /meals/:id', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('returns meal detail', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    installLoadMealDetailMock(mockQuery);

    const res = await request(getApp())
      .get(`/api/meals/${MEAL_ID}`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Sunday Dinner');
  });

  test('returns 404 when meal missing', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .get(`/api/meals/${MEAL_ID}`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  test('returns 404 for the cuid-style id from #343 without querying for the meal', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');

    const res = await request(getApp())
      .get('/api/meals/cmhgpjmfm00019p91zjsn04t2')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({error: 'Meal not found'});
    // The entitlement middleware queries billing tables first; the point
    // is that no query ever looks up a meal by the non-UUID id (that is
    // what threw the Postgres uuid syntax error).
    const mealLookups = mockQuery.mock.calls.filter(args =>
      String(args[0]).includes('from meals'),
    );
    expect(mealLookups).toEqual([]);
    expect(
      mockQuery.mock.calls.some(args =>
        (args[1] ?? []).includes('cmhgpjmfm00019p91zjsn04t2'),
      ),
    ).toBe(false);
  });

  test('returns 404 for a non-UUID id without querying for the meal', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');

    const res = await request(getApp())
      .get('/api/meals/not-a-uuid')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({error: 'Meal not found'});
    const mealLookups = mockQuery.mock.calls.filter(args =>
      String(args[0]).includes('from meals'),
    );
    expect(mealLookups).toEqual([]);
  });
});

describe('POST /meals', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('creates meal', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce(emptyShareGrant)
      .mockResolvedValueOnce(makeQueryResult([{id: MEAL_ID}]))
      .mockResolvedValueOnce(makeQueryResult([]));
    installLoadMealDetailMock(mockQuery);

    const res = await request(getApp())
      .post('/api/meals')
      .set('Authorization', 'Bearer valid-token')
      .send(mealInput);

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(MEAL_ID);
  });

  test('returns 400 when recipe is inaccessible', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(emptyShareGrant);

    const res = await request(getApp())
      .post('/api/meals')
      .set('Authorization', 'Bearer valid-token')
      .send(mealInput);

    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid body', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    const res = await request(getApp())
      .post('/api/meals')
      .set('Authorization', 'Bearer valid-token')
      .send({title: ''});

    expect(res.status).toBe(400);
  });

  test('returns 500 when saved meal cannot be reloaded', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce(emptyShareGrant)
      .mockResolvedValueOnce(makeQueryResult([{id: MEAL_ID}]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .post('/api/meals')
      .set('Authorization', 'Bearer valid-token')
      .send(mealInput);

    expect(res.status).toBe(500);
  });
});

describe('PUT /meals/:id', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('updates meal', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: MEAL_ID}]))
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce(emptyShareGrant)
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(makeQueryResult([]));
    installLoadMealDetailMock(mockQuery);

    const res = await request(getApp())
      .put(`/api/meals/${MEAL_ID}`)
      .set('Authorization', 'Bearer valid-token')
      .send(mealInput);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(MEAL_ID);
  });

  test('returns 404 when meal missing', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .put(`/api/meals/${MEAL_ID}`)
      .set('Authorization', 'Bearer valid-token')
      .send(mealInput);

    expect(res.status).toBe(404);
  });

  test('returns 400 when recipe is inaccessible', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: MEAL_ID}]))
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(emptyShareGrant);

    const res = await request(getApp())
      .put(`/api/meals/${MEAL_ID}`)
      .set('Authorization', 'Bearer valid-token')
      .send(mealInput);

    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid body', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    const res = await request(getApp())
      .put(`/api/meals/${MEAL_ID}`)
      .set('Authorization', 'Bearer valid-token')
      .send({title: ''});

    expect(res.status).toBe(400);
  });
});

describe('DELETE /meals/:id', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('deletes meal', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce({...makeQueryResult([]), rowCount: 1});

    const res = await request(getApp())
      .delete(`/api/meals/${MEAL_ID}`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(204);
  });

  test('returns 404 when meal missing', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce({...makeQueryResult([]), rowCount: 0});

    const res = await request(getApp())
      .delete(`/api/meals/${MEAL_ID}`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  test('returns 409 when meal is referenced by a plan', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(makeQueryResult([{exists: 1}]));

    const res = await request(getApp())
      .delete(`/api/meals/${MEAL_ID}`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(409);
  });
});

describe('GET /meals/:id/cook-plan', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('returns cook plan', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockImplementation((async (sql: string) => {
      if (sql.includes('from meals') && sql.includes('where id =')) {
        return makeQueryResult([
          {
            id: MEAL_ID,
            user_id: 'user-uuid-1',
            title: 'Sunday Dinner',
            notes: null,
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          },
        ]);
      }
      if (sql.includes('from meal_recipes')) {
        return makeQueryResult([
          {meal_id: MEAL_ID, recipe_id: RECIPE_ID, sort_order: 0, servings: 4},
        ]);
      }
      if (sql.includes('from recipes r')) {
        return makeQueryResult([accessibleRecipeRow]);
      }
      if (sql.includes('share_grants')) {
        return emptyShareGrant;
      }
      if (sql.includes('estimated_duration_min')) {
        return makeQueryResult([
          {
            id: 'instr-1',
            step_number: 1,
            body: 'Simmer',
            estimated_duration_min: 10,
          },
        ]);
      }
      return makeQueryResult([]);
    }) as typeof mockQuery);

    const res = await request(getApp())
      .get(`/api/meals/${MEAL_ID}/cook-plan`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.steps).toHaveLength(1);
  });

  test('returns 404 when meal missing', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));

    const res = await request(getApp())
      .get(`/api/meals/${MEAL_ID}/cook-plan`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  test('returns 409 when a recipe is inaccessible', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([mealRow]))
      .mockResolvedValueOnce(makeQueryResult([mealRecipeRow]))
      .mockResolvedValueOnce(
        makeQueryResult([{...accessibleRecipeRow, user_id: 'other-user'}]),
      )
      .mockResolvedValueOnce(emptyShareGrant)
      .mockResolvedValueOnce(
        makeQueryResult([{...accessibleRecipeRow, user_id: 'other-user'}]),
      )
      .mockResolvedValueOnce(emptyShareGrant);

    const res = await request(getApp())
      .get(`/api/meals/${MEAL_ID}/cook-plan`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(409);
  });

  test('returns 502 when cook plan cannot be built', async () => {
    nockSupabaseGetUser('user-uuid-1');
    mockBillingPlan(mockQuery, 'plus');
    mockQuery.mockImplementation((async (sql: string) => {
      if (sql.includes('from meals') && sql.includes('where id =')) {
        return makeQueryResult([
          {
            id: MEAL_ID,
            user_id: 'user-uuid-1',
            title: 'Sunday Dinner',
            notes: null,
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          },
        ]);
      }
      if (sql.includes('from meal_recipes')) {
        return makeQueryResult([
          {meal_id: MEAL_ID, recipe_id: RECIPE_ID, sort_order: 0, servings: 4},
        ]);
      }
      if (sql.includes('from recipes r')) {
        return makeQueryResult([
          {...accessibleRecipeRow, step_timing_status: 'failed'},
        ]);
      }
      if (sql.includes('share_grants')) {
        return emptyShareGrant;
      }
      if (sql.includes('estimated_duration_min')) {
        return makeQueryResult([]);
      }
      return makeQueryResult([]);
    }) as typeof mockQuery);

    const res = await request(getApp())
      .get(`/api/meals/${MEAL_ID}/cook-plan`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(502);
  });
});


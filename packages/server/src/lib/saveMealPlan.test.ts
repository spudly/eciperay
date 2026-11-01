import {jest} from '@jest/globals';
import type {QueryResult} from 'pg';

import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {
  accessibleRecipeRow,
  MEAL_ID,
  mealPlanRow,
} from '../test/fixtures/mealQueryRows.js';
import {
  emptyShareGrant,
  mealPlanInput,
  nutritionGoalsRow,
  PLAN_ID,
  RECIPE_ID,
  USER_ID,
} from '../test/mealQueryMock.js';
import {createMockQuery} from '../test/mockQuery.js';

type MockClient = {
  query: jest.Mock<(text: string, params?: unknown[]) => Promise<QueryResult>>;
  release: jest.Mock<() => void>;
};

const mockRelease = jest.fn<() => void>();
const mockConnect = jest.fn<() => Promise<MockClient>>();
const mockPoolQuery =
  jest.fn<(text: string, params?: unknown[]) => Promise<QueryResult>>();

// The default-query save paths run through the pool (runTransactional
// opens a transaction only for the real pool query), so the pool is
// mocked to exercise BEGIN/COMMIT/ROLLBACK behavior. Tests that inject
// their own query function never touch it.
jest.unstable_mockModule('../db/pool.js', () => ({
  default: {connect: mockConnect, query: mockPoolQuery},
}));

const {deleteMealPlan, replaceMealPlan, saveNewMealPlan} =
  await import('./saveMealPlan.js');

describe('saveNewMealPlan', () => {
  test('creates plan with recipe entry', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockImplementation((async (sql: string) => {
      if (sql.includes('from recipes r')) {
        return makeQueryResult([
          {
            id: RECIPE_ID,
            user_id: USER_ID,
            visibility: 'private',
            share_token_hash: null,
            version_id: 'version-1',
            servings: 4,
            title: 'Soup',
            image_url: null,
            calories: null,
            protein_g: null,
            carbs_g: null,
            fat_g: null,
            fiber_g: null,
            sugar_g: null,
            sodium_mg: null,
            prepared_weight_g: null,
            satiety_score: null,
            nutrition_status: null,
            step_timing_status: 'ready',
          },
        ]);
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

    const result = await saveNewMealPlan(USER_ID, mealPlanInput, mockQuery);
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.plan.id).toBe(PLAN_ID);
  });

  test('rejects missing meal reference', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const result = await saveNewMealPlan(
      USER_ID,
      {title: 'Week', entries: [{mealId: MEAL_ID}]},
      mockQuery,
    );
    expect(result).toEqual({error: `Meal not found: ${MEAL_ID}`, status: 400});
  });

  test('rejects duplicate recipe entries', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce(emptyShareGrant);
    const result = await saveNewMealPlan(
      USER_ID,
      {title: 'Week', entries: [{recipeId: RECIPE_ID}, {recipeId: RECIPE_ID}]},
      mockQuery,
    );
    expect(result).toEqual({error: 'Duplicate recipe in plan', status: 400});
  });

  test('rejects inaccessible recipe entries', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([]))
      .mockResolvedValueOnce(emptyShareGrant);
    const result = await saveNewMealPlan(
      USER_ID,
      {title: 'Week', entries: [{recipeId: RECIPE_ID}]},
      mockQuery,
    );
    expect(result).toEqual({
      error: `Recipe not found or not accessible: ${RECIPE_ID}`,
      status: 400,
    });
  });

  test('returns 500 when created plan cannot be loaded', async () => {
    const mockQuery = createMockQuery();
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
        return makeQueryResult([]);
      }
      return makeQueryResult([]);
    }) as typeof mockQuery);
    const result = await saveNewMealPlan(USER_ID, mealPlanInput, mockQuery);
    expect(result).toEqual({error: 'Failed to load meal plan', status: 500});
  });

  test('rejects duplicate meal entries', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(makeQueryResult([{id: MEAL_ID}]));
    const result = await saveNewMealPlan(
      USER_ID,
      {title: 'Week', entries: [{mealId: MEAL_ID}, {mealId: MEAL_ID}]},
      mockQuery,
    );
    expect(result).toEqual({error: 'Duplicate meal in plan', status: 400});
  });
});

describe('replaceMealPlan', () => {
  test('returns 404 when plan missing', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const result = await replaceMealPlan(
      PLAN_ID,
      USER_ID,
      mealPlanInput,
      mockQuery,
    );
    expect(result).toEqual({error: 'Meal plan not found', status: 404});
  });

  test('returns validation errors from resolveEntries', async () => {
    const mockQuery = createMockQuery();
    mockQuery
      .mockResolvedValueOnce(makeQueryResult([{id: PLAN_ID}]))
      .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
      .mockResolvedValueOnce(emptyShareGrant);
    const result = await replaceMealPlan(
      PLAN_ID,
      USER_ID,
      {title: 'Week', entries: [{recipeId: RECIPE_ID}, {recipeId: RECIPE_ID}]},
      mockQuery,
    );
    expect(result).toEqual({error: 'Duplicate recipe in plan', status: 400});
  });

  test('returns 500 when updated plan cannot be loaded', async () => {
    const mockQuery = createMockQuery();
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
        return makeQueryResult([]);
      }
      return makeQueryResult([]);
    }) as typeof mockQuery);
    const result = await replaceMealPlan(
      PLAN_ID,
      USER_ID,
      mealPlanInput,
      mockQuery,
    );
    expect(result).toEqual({error: 'Failed to load meal plan', status: 500});
  });

  test('updates existing plan', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockImplementation((async (sql: string) => {
      if (sql.includes('select id from meal_plans where id')) {
        return makeQueryResult([{id: PLAN_ID}]);
      }
      if (sql.includes('from recipes r')) {
        return makeQueryResult([
          {
            id: RECIPE_ID,
            user_id: USER_ID,
            visibility: 'private',
            share_token_hash: null,
            version_id: 'version-1',
            servings: 4,
            title: 'Soup',
            image_url: null,
            calories: null,
            protein_g: null,
            carbs_g: null,
            fat_g: null,
            fiber_g: null,
            sugar_g: null,
            sodium_mg: null,
            prepared_weight_g: null,
            satiety_score: null,
            nutrition_status: null,
            step_timing_status: 'ready',
          },
        ]);
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

    const result = await replaceMealPlan(
      PLAN_ID,
      USER_ID,
      mealPlanInput,
      mockQuery,
    );
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.plan.id).toBe(PLAN_ID);
  });
});

describe('deleteMealPlan', () => {
  test('returns 404 when plan missing', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce({...makeQueryResult([]), rowCount: 0});
    const result = await deleteMealPlan(PLAN_ID, USER_ID, mockQuery);
    expect(result).toEqual({error: 'Meal plan not found', status: 404});
  });

  test('deletes plan', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce({...makeQueryResult([]), rowCount: 1});
    const result = await deleteMealPlan(PLAN_ID, USER_ID, mockQuery);
    expect(result).toEqual({ok: true});
  });
});

describe('saveNewMealPlan meal entries', () => {
  test('creates plan with saved meal reference', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockImplementation((async (sql: string, params?: unknown[]) => {
      if (sql.includes('from meals where id = $1 and user_id')) {
        return makeQueryResult([{id: MEAL_ID}]);
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
            meal_id: MEAL_ID,
            recipe_id: null,
            servings: null,
          },
        ]);
      }
      if (sql.includes('from meals') && params?.[0] === MEAL_ID) {
        return makeQueryResult([
          {
            id: MEAL_ID,
            user_id: USER_ID,
            title: 'Sunday Dinner',
            notes: null,
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          },
        ]);
      }
      if (sql.includes('from meal_recipes')) {
        return makeQueryResult([]);
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
      if (sql.includes('from recipes r')) {
        return makeQueryResult([]);
      }
      if (sql.includes('share_grants')) {
        return emptyShareGrant;
      }
      return makeQueryResult([]);
    }) as typeof mockQuery);

    const result = await saveNewMealPlan(
      USER_ID,
      {title: 'Week', entries: [{mealId: MEAL_ID}]},
      mockQuery,
    );
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.plan.id).toBe(PLAN_ID);
  });
});

describe('saveMealPlan on the default query path (transactions)', () => {
  const planEntryRow = {
    id: 'entry-1',
    meal_plan_id: PLAN_ID,
    sort_order: 0,
    quantity: 1,
    meal_id: null,
    recipe_id: RECIPE_ID,
    servings: 4,
  };

  // Queries that run outside the transaction (the replace existence
  // check and entry resolution) go through the pool's shared query.
  const installPoolRouting = () => {
    mockPoolQuery.mockImplementation((text: string) => {
      if (text.includes('select id from meal_plans')) {
        return Promise.resolve(makeQueryResult([{id: PLAN_ID}]));
      }
      if (text.includes('from recipes r')) {
        return Promise.resolve(makeQueryResult([accessibleRecipeRow]));
      }
      if (text.includes('share_grants')) {
        return Promise.resolve(emptyShareGrant);
      }
      return Promise.resolve(makeQueryResult([]));
    });
  };

  const makeTxClient = (failEntryInsert = false): MockClient => {
    const query =
      jest.fn<(text: string, params?: unknown[]) => Promise<QueryResult>>();
    query.mockImplementation((text: string) => {
      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
        return Promise.resolve(makeQueryResult([]));
      }
      if (text.includes('insert into meal_plan_entries')) {
        if (failEntryInsert) {
          return Promise.reject(new Error('entry insert failed'));
        }
        return Promise.resolve(makeQueryResult([]));
      }
      if (text.includes('insert into meal_plans')) {
        return Promise.resolve(makeQueryResult([{id: PLAN_ID}]));
      }
      if (
        text.includes('update meal_plans') ||
        text.includes('delete from meal_plan_entries')
      ) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (text.includes('from meal_plans') && text.includes('where id =')) {
        return Promise.resolve(makeQueryResult([mealPlanRow]));
      }
      if (text.includes('from meal_plan_entries')) {
        return Promise.resolve(makeQueryResult([planEntryRow]));
      }
      if (text.includes('from recipes r')) {
        return Promise.resolve(makeQueryResult([accessibleRecipeRow]));
      }
      if (text.includes('share_grants')) {
        return Promise.resolve(emptyShareGrant);
      }
      if (text.includes('goal_calories')) {
        return Promise.resolve(makeQueryResult([nutritionGoalsRow]));
      }
      return Promise.resolve(makeQueryResult([]));
    });
    return {query, release: mockRelease};
  };

  const calledSql = (client: MockClient): string[] =>
    client.query.mock.calls.map(([text]) => text);

  beforeEach(() => {
    mockConnect.mockReset();
    mockPoolQuery.mockReset();
    mockRelease.mockReset();
  });

  test('create commits plan, entries, and read-back on one client', async () => {
    installPoolRouting();
    const client = makeTxClient();
    mockConnect.mockResolvedValue(client);
    const result = await saveNewMealPlan(USER_ID, mealPlanInput);
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.plan.id).toBe(PLAN_ID);
    const sql = calledSql(client);
    expect(sql[0]).toBe('BEGIN');
    expect(sql[sql.length - 1]).toBe('COMMIT');
    expect(sql).not.toContain('ROLLBACK');
    expect(mockRelease).toHaveBeenCalledTimes(1);
    // No write escaped the transaction onto the shared pool.
    expect(
      mockPoolQuery.mock.calls.some(([text]) => text.includes('insert into')),
    ).toBe(false);
  });

  test('create rolls back when an entry insert fails', async () => {
    installPoolRouting();
    const client = makeTxClient(true);
    mockConnect.mockResolvedValue(client);
    await expect(saveNewMealPlan(USER_ID, mealPlanInput)).rejects.toThrow(
      'entry insert failed',
    );
    const sql = calledSql(client);
    expect(sql[0]).toBe('BEGIN');
    expect(sql).toContain('ROLLBACK');
    expect(sql).not.toContain('COMMIT');
    expect(mockRelease).toHaveBeenCalledTimes(1);
    // The read-back runs inside the transaction, so it is never attempted.
    expect(sql.some(text => text.includes('from meal_plans'))).toBe(false);
  });

  test('replace commits update, delete, inserts, and read-back on one client', async () => {
    installPoolRouting();
    const client = makeTxClient();
    mockConnect.mockResolvedValue(client);
    const result = await replaceMealPlan(PLAN_ID, USER_ID, mealPlanInput);
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.plan.id).toBe(PLAN_ID);
    const sql = calledSql(client);
    expect(sql[0]).toBe('BEGIN');
    expect(sql[sql.length - 1]).toBe('COMMIT');
    expect(sql).not.toContain('ROLLBACK');
    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(
      mockPoolQuery.mock.calls.some(([text]) =>
        text.includes('update meal_plans'),
      ),
    ).toBe(false);
  });

  test('replace rolls back when an entry insert fails after the delete', async () => {
    installPoolRouting();
    const client = makeTxClient(true);
    mockConnect.mockResolvedValue(client);
    await expect(
      replaceMealPlan(PLAN_ID, USER_ID, mealPlanInput),
    ).rejects.toThrow('entry insert failed');
    const sql = calledSql(client);
    expect(sql[0]).toBe('BEGIN');
    const updateAt = sql.findIndex(text => text.includes('update meal_plans'));
    const deleteAt = sql.findIndex(text =>
      text.includes('delete from meal_plan_entries'),
    );
    const insertAt = sql.findIndex(text =>
      text.includes('insert into meal_plan_entries'),
    );
    expect(updateAt).toBeGreaterThan(-1);
    expect(deleteAt).toBeGreaterThan(updateAt);
    expect(insertAt).toBeGreaterThan(deleteAt);
    expect(sql).toContain('ROLLBACK');
    expect(sql).not.toContain('COMMIT');
    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(sql.some(text => text.includes('from meal_plans'))).toBe(false);
  });
});

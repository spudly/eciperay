import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {
  accessibleRecipeRow,
  MEAL_ID,
  mealPlanRow,
} from '../test/fixtures/mealQueryRows.js';
import {
  emptyShareGrant,
  mealPlanInput,
  PLAN_ID,
  RECIPE_ID,
  USER_ID,
} from '../test/mealQueryMock.js';
import {createMockQuery} from '../test/mockQuery.js';

import {
  deleteMealPlan,
  replaceMealPlan,
  saveNewMealPlan,
} from './saveMealPlan.js';

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

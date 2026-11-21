import type {QueryResultRow} from 'pg';

import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {
  MEAL_ID,
  PLAN_ID,
  RECIPE_ID,
  USER_ID,
  accessibleRecipeRow,
  mealIngredientRow,
  mealPlanRow,
  mealRecipeRow,
  mealRow,
} from '../test/fixtures/mealQueryRows.js';
import {createMockQuery} from '../test/mockQuery.js';

import {listMealPlansForUser} from './listMealPlansForUser.js';

const emptyShareAccess = {...makeQueryResult([]), rowCount: 0};

const nutritionGoalsRow = {
  goal_calories_min: null,
  goal_calories_max: null,
  goal_protein_g_min: null,
  goal_protein_g_max: null,
  goal_carbs_g_min: null,
  goal_carbs_g_max: null,
  goal_fat_g_min: null,
  goal_fat_g_max: null,
  goal_satiety_score_min: null,
  goal_satiety_score_max: null,
};

/**
 * Mock for the batched summary queries (#644): answers each of
 * listMealPlansForUser's constant set of queries from the given rows, keyed by
 * the table each query reads. `plans` defaults to the single fixture plan;
 * entries default to none.
 */
const createSummaryMockQuery = (
  overrides: {
    plans?: QueryResultRow[];
    entries?: QueryResultRow[];
    meals?: QueryResultRow[];
    mealRecipes?: QueryResultRow[];
    mealIngredients?: QueryResultRow[];
    recipes?: QueryResultRow[];
  } = {},
) => {
  const mockQuery = createMockQuery();
  mockQuery.mockImplementation((async (sql: string) => {
    if (sql.includes('from meal_plan_entries')) {
      return makeQueryResult(overrides.entries ?? []);
    }
    if (sql.includes('from meal_plans')) {
      return makeQueryResult(overrides.plans ?? [mealPlanRow]);
    }
    if (sql.includes('from meal_recipes')) {
      return makeQueryResult(overrides.mealRecipes ?? []);
    }
    if (sql.includes('from meal_ingredients')) {
      return makeQueryResult(overrides.mealIngredients ?? []);
    }
    if (sql.includes('from meals')) {
      return makeQueryResult(overrides.meals ?? []);
    }
    if (sql.includes('recipe_share_grants')) {
      return emptyShareAccess;
    }
    if (sql.includes('from recipes r')) {
      return makeQueryResult(overrides.recipes ?? []);
    }
    if (sql.includes('goal_calories')) {
      return makeQueryResult([nutritionGoalsRow]);
    }
    return makeQueryResult([]);
  }) as typeof mockQuery);
  return mockQuery;
};

describe('listMealPlansForUser', () => {
  test('returns plan summaries without entries', async () => {
    const mockQuery = createSummaryMockQuery();

    const plans = await listMealPlansForUser(USER_ID, mockQuery);
    expect(plans).toHaveLength(1);
    expect(plans[0]?.id).toBe(PLAN_ID);
    expect(plans[0]).not.toHaveProperty('entries');
  });

  test('returns summaries for a dated plan whose row carries Date objects', async () => {
    // Regression (#360): one dated plan in the account (e.g. an orphan
    // left by a failed dated save) threw in the old detail-based list
    // and 500ed the whole list, even though the user's other plans are
    // dateless. Rows here carry the real driver types: Date objects for
    // the DATE and timestamptz columns.
    const mockQuery = createSummaryMockQuery({
      plans: [
        {
          ...mealPlanRow,
          starts_on: new Date(2026, 10, 2),
          ends_on: new Date(2026, 10, 8),
          created_at: new Date('2026-11-01T18:39:22.249Z'),
          updated_at: new Date('2026-11-01T19:22:05.819Z'),
        },
      ],
    });

    const plans = await listMealPlansForUser(USER_ID, mockQuery);
    expect(plans).toHaveLength(1);
    expect(plans[0]?.startsOn).toBe('2026-11-02');
    expect(plans[0]?.endsOn).toBe('2026-11-08');
    expect(plans[0]?.createdAt).toBe('2026-11-01T18:39:22.249Z');
    expect(plans[0]?.updatedAt).toBe('2026-11-01T19:22:05.819Z');
  });

  test('runs a constant number of queries regardless of plan and entry count (#644)', async () => {
    // Regression for the sequential N+1: the old implementation called
    // loadMealPlanDetail once per plan (each with its own per-entry
    // queries). The summary path must issue the same small set of
    // batched queries for 1 plan as for many, and must never issue the
    // detail loader's per-plan / per-entry queries.
    const planIds = ['plan-1', 'plan-2', 'plan-3', 'plan-4', 'plan-5'];
    const buildMock = (ids: string[]) => {
      const mockQuery = createMockQuery();
      mockQuery.mockImplementation((async (sql: string, params?: unknown[]) => {
        if (sql.includes('from meal_plan_entries')) {
          const requested = (params?.[0] as string[] | undefined) ?? [];
          return makeQueryResult(
            requested.flatMap(planId => [
              {
                id: `${planId}-entry-1`,
                meal_plan_id: planId,
                sort_order: 0,
                quantity: 1,
                meal_id: null,
                recipe_id: RECIPE_ID,
                servings: 4,
                servings_to_eat: 4,
                day: null,
              },
              {
                id: `${planId}-entry-2`,
                meal_plan_id: planId,
                sort_order: 1,
                quantity: 1,
                meal_id: null,
                recipe_id: RECIPE_ID,
                servings: 4,
                servings_to_eat: 4,
                day: null,
              },
            ]),
          );
        }
        if (sql.includes('from meal_plans')) {
          return makeQueryResult(ids.map(id => ({...mealPlanRow, id})));
        }
        if (sql.includes('recipe_share_grants')) {
          return emptyShareAccess;
        }
        if (sql.includes('from recipes r')) {
          return makeQueryResult([accessibleRecipeRow]);
        }
        if (sql.includes('goal_calories')) {
          return makeQueryResult([nutritionGoalsRow]);
        }
        return makeQueryResult([]);
      }) as typeof mockQuery);
      return mockQuery;
    };

    const onePlanMock = buildMock([PLAN_ID]);
    const onePlan = await listMealPlansForUser(USER_ID, onePlanMock);
    const manyPlansMock = buildMock(planIds);
    const manyPlans = await listMealPlansForUser(USER_ID, manyPlansMock);

    expect(manyPlans).toHaveLength(planIds.length);
    // Same query count for 5 plans × 2 entries as for 1 plan × 2 entries.
    expect(manyPlansMock.mock.calls.length).toBe(onePlanMock.mock.calls.length);
    expect(manyPlansMock.mock.calls.length).toBeLessThanOrEqual(8);
    // No per-plan detail query (loadMealPlanDetail's plan lookup) and no
    // per-entry recipe lookup ever appear on the list path.
    for (const mock of [onePlanMock, manyPlansMock]) {
      for (const [sql] of mock.mock.calls) {
        expect(sql).not.toMatch(/from meal_plans\s+where id =/);
        expect(sql).not.toMatch(/from recipes r[\s\S]*where r\.id = \$1\s*$/);
      }
    }
    // Summaries stay identical in shape and content at both scales:
    // 2 entries of a 100 cal/serving recipe eaten at 4 servings = 800.
    expect(onePlan[0]?.entryCount).toBe(2);
    expect(manyPlans[0]?.entryCount).toBe(2);
    expect(manyPlans[0]?.nutrition?.calories).toBe(800);
    expect(manyPlans[0]?.nutrition).toEqual(onePlan[0]?.nutrition);
  });

  test('includes meal-entry nutrition and counts, skipping missing meals', async () => {
    const mockQuery = createSummaryMockQuery({
      entries: [
        {
          id: 'entry-meal',
          meal_plan_id: PLAN_ID,
          sort_order: 0,
          quantity: 1,
          meal_id: MEAL_ID,
          recipe_id: null,
          servings: null,
          servings_to_eat: null,
          day: null,
        },
        {
          id: 'entry-missing-meal',
          meal_plan_id: PLAN_ID,
          sort_order: 1,
          quantity: 1,
          meal_id: 'missing-meal-id',
          recipe_id: null,
          servings: null,
          servings_to_eat: null,
          day: null,
        },
        {
          id: 'entry-blank',
          meal_plan_id: PLAN_ID,
          sort_order: 2,
          quantity: 1,
          meal_id: null,
          recipe_id: null,
          servings: null,
          servings_to_eat: null,
          day: null,
        },
      ],
      meals: [mealRow],
      mealIngredients: [mealIngredientRow],
    });

    const plans = await listMealPlansForUser(USER_ID, mockQuery);
    // Only the existing meal entry counts (missing meal and blank rows
    // are skipped, as in loadMealPlanDetail); its direct ingredient
    // contributes 200 cal/serving × 2 eaten = 400 to the plan total.
    expect(plans[0]?.entryCount).toBe(1);
    expect(plans[0]?.nutrition).toMatchObject({calories: 400, status: 'ready'});
  });

  test('marks recipe entries from inaccessible recipes access-lost in nutrition', async () => {
    const mockQuery = createSummaryMockQuery({
      entries: [
        {
          id: 'entry-1',
          meal_plan_id: PLAN_ID,
          sort_order: 0,
          quantity: 1,
          meal_id: null,
          recipe_id: RECIPE_ID,
          servings: 4,
          servings_to_eat: 4,
          day: null,
        },
      ],
      recipes: [{...accessibleRecipeRow, user_id: 'other-user'}],
    });

    const plans = await listMealPlansForUser(USER_ID, mockQuery);
    expect(plans[0]?.entryCount).toBe(1);
    // The recipe is private to another user with no share access, so its
    // nutrition cannot contribute — same result the detail path gives.
    expect(plans[0]?.nutrition?.status).toBe('unavailable');
    expect(plans[0]?.nutrition?.calories).toBe(0);
  });

  test('counts meal recipe members in meal nutrition via batched rows', async () => {
    const mockQuery = createSummaryMockQuery({
      entries: [
        {
          id: 'entry-meal',
          meal_plan_id: PLAN_ID,
          sort_order: 0,
          quantity: 1,
          meal_id: MEAL_ID,
          recipe_id: null,
          servings: null,
          servings_to_eat: null,
          day: null,
        },
      ],
      meals: [mealRow],
      mealRecipes: [mealRecipeRow],
      recipes: [accessibleRecipeRow],
    });

    const plans = await listMealPlansForUser(USER_ID, mockQuery);
    // Member recipe: 100 cal/serving eaten at 4 servings = 400.
    expect(plans[0]?.entryCount).toBe(1);
    expect(plans[0]?.nutrition).toMatchObject({calories: 400, status: 'ready'});
  });
});

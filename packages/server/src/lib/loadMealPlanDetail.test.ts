import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {
  MEAL_ID,
  PLAN_ID,
  RECIPE_ID,
  USER_ID,
  accessibleRecipeRow,
  mealPlanRow,
  mealRow,
} from '../test/fixtures/mealQueryRows.js';
import {createMockQuery} from '../test/mockQuery.js';

import {loadMealPlanDetail} from './loadMealPlanDetail.js';

const emptyShareGrant = {...makeQueryResult([]), rowCount: 0};

describe('loadMealPlanDetail', () => {
  test('returns null when plan is missing', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    await expect(
      loadMealPlanDetail(PLAN_ID, USER_ID, mockQuery),
    ).resolves.toBeNull();
  });

  test('loads recipe entry on plan', async () => {
    const mockQuery = createMockQuery();
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
      if (sql.includes('from meals')) {
        return makeQueryResult([mealRow]);
      }
      return makeQueryResult([]);
    }) as typeof mockQuery);

    const plan = await loadMealPlanDetail(PLAN_ID, USER_ID, mockQuery);
    expect(plan?.title).toBe('This week');
    expect(plan?.entries).toHaveLength(1);
    expect(plan?.entries[0]?.type).toBe('recipe');
    expect(plan?.entries[0]?.title).toBe('Soup');
  });

  test('loads meal entry on plan', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockImplementation((async (sql: string) => {
      if (sql.includes('from meal_plans') && sql.includes('where id =')) {
        return makeQueryResult([mealPlanRow]);
      }
      if (sql.includes('from meal_plan_entries')) {
        return makeQueryResult([
          {
            id: 'entry-meal',
            meal_plan_id: PLAN_ID,
            sort_order: 0,
            quantity: 1,
            meal_id: MEAL_ID,
            recipe_id: null,
            servings: null,
          },
        ]);
      }
      if (sql.includes('from meals') && sql.includes('where id =')) {
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
      return makeQueryResult([]);
    }) as typeof mockQuery);

    const plan = await loadMealPlanDetail(PLAN_ID, USER_ID, mockQuery);
    expect(plan?.entries[0]?.type).toBe('meal');
    expect(plan?.entries[0]?.title).toBe('Sunday Dinner');
  });

  test('skips missing meals and blank entry rows', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockImplementation((async (sql: string) => {
      if (sql.includes('from meal_plans') && sql.includes('where id =')) {
        return makeQueryResult([mealPlanRow]);
      }
      if (sql.includes('from meal_plan_entries')) {
        return makeQueryResult([
          {
            id: 'entry-missing-meal',
            meal_plan_id: PLAN_ID,
            sort_order: 0,
            quantity: 1,
            meal_id: MEAL_ID,
            recipe_id: null,
            servings: null,
          },
          {
            id: 'entry-blank',
            meal_plan_id: PLAN_ID,
            sort_order: 1,
            quantity: 1,
            meal_id: null,
            recipe_id: null,
            servings: null,
          },
        ]);
      }
      if (sql.includes('from meals') && sql.includes('where id =')) {
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
      return makeQueryResult([]);
    }) as typeof mockQuery);

    const plan = await loadMealPlanDetail(PLAN_ID, USER_ID, mockQuery);
    expect(plan?.entries).toEqual([]);
  });

  test('nulls date-only fields when plan dates are missing', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockImplementation((async (sql: string) => {
      if (sql.includes('from meal_plans') && sql.includes('where id =')) {
        return makeQueryResult([
          {...mealPlanRow, starts_on: null, ends_on: null},
        ]);
      }
      if (sql.includes('from meal_plan_entries')) {
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
      return makeQueryResult([]);
    }) as typeof mockQuery);

    const plan = await loadMealPlanDetail(PLAN_ID, USER_ID, mockQuery);
    expect(plan?.startsOn).toBeNull();
    expect(plan?.endsOn).toBeNull();
  });

  test('defaults recipe entry servings from recipe row', async () => {
    const mockQuery = createMockQuery();
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
            servings: null,
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
      return makeQueryResult([]);
    }) as typeof mockQuery);

    const plan = await loadMealPlanDetail(PLAN_ID, USER_ID, mockQuery);
    expect(plan?.entries[0]).toEqual(
      expect.objectContaining({
        type: 'recipe',
        servings: accessibleRecipeRow.servings,
      }),
    );
  });

  test('defaults recipe entry servings to one when missing everywhere', async () => {
    const mockQuery = createMockQuery();
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
            servings: null,
          },
        ]);
      }
      if (sql.includes('from recipes r')) {
        return makeQueryResult([{...accessibleRecipeRow, servings: null}]);
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
      return makeQueryResult([]);
    }) as typeof mockQuery);

    const plan = await loadMealPlanDetail(PLAN_ID, USER_ID, mockQuery);
    expect(plan?.entries[0]).toEqual(
      expect.objectContaining({type: 'recipe', servings: 1}),
    );
  });

  test('marks recipe entry accessLost when recipe is private to another user', async () => {
    const mockQuery = createMockQuery();
    const privateRecipe = {...accessibleRecipeRow, user_id: 'other-user'};
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
        return makeQueryResult([privateRecipe]);
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
      return makeQueryResult([]);
    }) as typeof mockQuery);

    const plan = await loadMealPlanDetail(PLAN_ID, USER_ID, mockQuery);
    expect(plan?.entries[0]).toEqual(
      expect.objectContaining({type: 'recipe', accessLost: true}),
    );
  });
});

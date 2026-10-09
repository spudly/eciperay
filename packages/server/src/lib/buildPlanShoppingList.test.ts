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

import {buildPlanShoppingList} from './buildPlanShoppingList.js';

const emptyShareGrant = {...makeQueryResult([]), rowCount: 0};

describe('buildPlanShoppingList', () => {
  test('returns 404 when plan is missing', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(makeQueryResult([]));
    const result = await buildPlanShoppingList(PLAN_ID, USER_ID, mockQuery);
    expect(result).toEqual({error: 'Meal plan not found', status: 404});
  });

  test('aggregates ingredients for recipe entries', async () => {
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
      if (sql.includes('from ingredients')) {
        return makeQueryResult([
          {name: 'Flour', quantity: 2, unit: 'cups', is_optional: false},
        ]);
      }
      return makeQueryResult([]);
    }) as typeof mockQuery);

    const result = await buildPlanShoppingList(PLAN_ID, USER_ID, mockQuery);
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.name).toBe('Flour');
  });

  test('includes ingredients from meal entries', async () => {
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
            quantity: 2,
            meal_id: MEAL_ID,
            recipe_id: null,
            servings: null,
          },
        ]);
      }
      if (sql.includes('from meal_recipes where meal_id')) {
        return makeQueryResult([{recipe_id: RECIPE_ID, servings: 4}]);
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
      if (sql.includes('from meals') && sql.includes('where id =')) {
        return makeQueryResult([mealRow]);
      }
      if (
        sql.includes('from meal_recipes') &&
        sql.includes('where meal_id = $1')
      ) {
        return makeQueryResult([{recipe_id: RECIPE_ID, servings: 4}]);
      }
      if (sql.includes('from ingredients')) {
        return makeQueryResult([
          {name: 'Salt', quantity: 1, unit: 'tsp', is_optional: false},
        ]);
      }
      return makeQueryResult([]);
    }) as typeof mockQuery);

    const result = await buildPlanShoppingList(PLAN_ID, USER_ID, mockQuery);
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.lines.some(line => line.name === 'Salt')).toBe(true);
  });

  test('skips lost-access recipe entries', async () => {
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
        return makeQueryResult([]);
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

    const result = await buildPlanShoppingList(PLAN_ID, USER_ID, mockQuery);
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.lines).toEqual([]);
  });

  test('skips inaccessible recipes on meal entries', async () => {
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
            meal_id: MEAL_ID,
            recipe_id: null,
            servings: null,
          },
        ]);
      }
      if (sql.includes('from meals') && sql.includes('where id =')) {
        return makeQueryResult([mealRow]);
      }
      if (sql.includes('from meal_recipes')) {
        return makeQueryResult([{recipe_id: RECIPE_ID, servings: 4}]);
      }
      if (sql.includes('from recipes r')) {
        return makeQueryResult([]);
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

    const result = await buildPlanShoppingList(PLAN_ID, USER_ID, mockQuery);
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.lines).toEqual([]);
  });

  test('skips recipe entries when access is lost after plan load', async () => {
    const mockQuery = createMockQuery();
    let recipeLoads = 0;
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
        recipeLoads += 1;
        if (recipeLoads === 1) {
          return makeQueryResult([accessibleRecipeRow]);
        }
        return makeQueryResult([]);
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

    const result = await buildPlanShoppingList(PLAN_ID, USER_ID, mockQuery);
    if ('error' in result) {
      throw new Error(result.error);
    }
    expect(result.lines).toEqual([]);
  });
});

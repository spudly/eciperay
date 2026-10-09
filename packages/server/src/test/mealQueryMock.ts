import {makeQueryResult} from './fixtures/queryResult.js';
import {
  PLAN_ID,
  RECIPE_ID,
  accessibleRecipeRow,
  mealPlanRow,
  mealRecipeRow,
  mealRow,
} from './fixtures/mealQueryRows.js';
import type {createMockQuery} from './mockQuery.js';

export const emptyShareGrant = {...makeQueryResult([]), rowCount: 0};

export const nutritionGoalsRow = {
  goal_calories: null,
  goal_protein_g: null,
  goal_carbs_g: null,
  goal_fat_g: null,
  goal_satiety_score: null,
};

export const installLoadMealDetailMock = (
  mockQuery: ReturnType<typeof createMockQuery>,
) => {
  mockQuery
    .mockResolvedValueOnce(makeQueryResult([mealRow]))
    .mockResolvedValueOnce(makeQueryResult([mealRecipeRow]))
    .mockResolvedValueOnce(makeQueryResult([accessibleRecipeRow]))
    .mockResolvedValueOnce(emptyShareGrant);
};

export const installLoadMealPlanDetailRecipeMock = (
  mockQuery: ReturnType<typeof createMockQuery>,
) => {
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
      return makeQueryResult([nutritionGoalsRow]);
    }
    if (sql.includes('from meals') && sql.includes('where id =')) {
      return makeQueryResult([mealRow]);
    }
    if (sql.includes('from meal_recipes')) {
      return makeQueryResult([mealRecipeRow]);
    }
    return makeQueryResult([]);
  }) as typeof mockQuery);
};

export const mealInput = {
  title: 'Dinner',
  recipes: [{recipeId: RECIPE_ID, servings: 4}],
};

export const mealPlanInput = {
  title: 'Week',
  entries: [{recipeId: RECIPE_ID, quantity: 1, servings: 4}],
};

export {
  MEAL_ID,
  USER_ID,
  PLAN_ID,
  RECIPE_ID,
} from './fixtures/mealQueryRows.js';

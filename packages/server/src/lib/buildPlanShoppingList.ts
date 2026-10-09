import type {ShoppingListLine} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';

import {
  buildShoppingList,
  type ShoppingIngredientInput,
} from './buildShoppingList.js';
import {loadMealPlanDetail} from './loadMealPlanDetail.js';
import {loadAccessibleRecipe} from './mealRecipeAccess.js';

type QueryFn = typeof defaultQuery;

const INGREDIENTS_SQL = `
  select name, quantity, unit, is_optional
  from ingredients
  where recipe_version_id = $1
  order by sort_order asc
`;

const MEAL_RECIPES_SQL = `
  select recipe_id, servings
  from meal_recipes
  where meal_id = $1
  order by sort_order asc
`;

export const buildPlanShoppingList = async (
  planId: string,
  userId: string,
  queryFn: QueryFn = defaultQuery,
): Promise<{lines: ShoppingListLine[]} | {error: string; status: number}> => {
  const plan = await loadMealPlanDetail(planId, userId, queryFn);
  if (!plan) {
    return {error: 'Meal plan not found', status: 404};
  }

  const ingredients: ShoppingIngredientInput[] = [];

  for (const entry of plan.entries) {
    if (entry.type === 'meal') {
      const mealRecipesResult = await queryFn(MEAL_RECIPES_SQL, [entry.mealId]);
      const mealRecipes = mealRecipesResult.rows as {
        recipe_id: string;
        servings: number;
      }[];
      for (const mealRecipe of mealRecipes) {
        const recipe = await loadAccessibleRecipe(
          mealRecipe.recipe_id,
          userId,
          queryFn,
        );
        if (!recipe) {
          continue;
        }
        const ingredientResult = await queryFn(INGREDIENTS_SQL, [
          recipe.version_id,
        ]);
        const rows = ingredientResult.rows as {
          name: string;
          quantity: number | null;
          unit: string | null;
          is_optional: boolean;
        }[];
        for (const row of rows) {
          ingredients.push({
            name: row.name,
            quantity: row.quantity,
            unit: row.unit,
            isOptional: row.is_optional,
            servings: mealRecipe.servings,
            recipeServings: recipe.servings,
            quantityMultiplier: entry.quantity,
            source: {
              mealId: entry.mealId,
              mealTitle: entry.title,
              recipeId: recipe.id,
              recipeTitle: recipe.title,
            },
          });
        }
      }
      continue;
    }

    if (entry.accessLost) {
      continue;
    }
    const recipe = await loadAccessibleRecipe(entry.recipeId, userId, queryFn);
    if (!recipe) {
      continue;
    }
    const ingredientResult = await queryFn(INGREDIENTS_SQL, [
      recipe.version_id,
    ]);
    const rows = ingredientResult.rows as {
      name: string;
      quantity: number | null;
      unit: string | null;
      is_optional: boolean;
    }[];
    for (const row of rows) {
      ingredients.push({
        name: row.name,
        quantity: row.quantity,
        unit: row.unit,
        isOptional: row.is_optional,
        servings: entry.servings,
        recipeServings: recipe.servings,
        quantityMultiplier: entry.quantity,
        source: {
          mealId: null,
          mealTitle: null,
          recipeId: recipe.id,
          recipeTitle: recipe.title,
        },
      });
    }
  }

  return {lines: buildShoppingList(ingredients)};
};

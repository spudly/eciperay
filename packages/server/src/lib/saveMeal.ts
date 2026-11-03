import type {MealDetail, MealInput} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';

import {staleWriteConflict, updatedAtMatches} from './conditionalWrite.js';
import {loadMealDetail} from './loadMealDetail.js';
import {loadAccessibleRecipe} from './mealRecipeAccess.js';

type QueryFn = typeof defaultQuery;

export const saveNewMeal = async (
  userId: string,
  input: MealInput,
  queryFn: QueryFn = defaultQuery,
): Promise<{meal: MealDetail} | {error: string; status: number}> => {
  const resolved: {recipeId: string; servings: number; sortOrder: number}[] =
    [];
  for (const [index, recipe] of input.recipes.entries()) {
    const accessible = await loadAccessibleRecipe(
      recipe.recipeId,
      userId,
      queryFn,
    );
    if (!accessible) {
      return {
        error: `Recipe not found or not accessible: ${recipe.recipeId}`,
        status: 400,
      };
    }
    resolved.push({
      recipeId: recipe.recipeId,
      servings: recipe.servings ?? accessible.servings,
      sortOrder: index,
    });
  }

  const mealResult = await queryFn(
    `insert into meals (user_id, title, notes)
     values ($1, $2, $3)
     returning id`,
    [userId, input.title, input.notes ?? null],
  );
  const mealId = (mealResult.rows[0] as {id: string}).id;

  for (const recipe of resolved) {
    await queryFn(
      `insert into meal_recipes (meal_id, recipe_id, sort_order, servings)
       values ($1, $2, $3, $4)`,
      [mealId, recipe.recipeId, recipe.sortOrder, recipe.servings],
    );
  }

  const meal = await loadMealDetail(mealId, userId, queryFn);
  if (!meal) {
    return {error: 'Failed to load meal', status: 500};
  }
  return {meal};
};

export const replaceMeal = async (
  mealId: string,
  userId: string,
  input: MealInput,
  queryFn: QueryFn = defaultQuery,
): Promise<{meal: MealDetail} | {error: string; status: number}> => {
  const existing = await queryFn(
    `select id, updated_at from meals where id = $1 and user_id = $2`,
    [mealId, userId],
  );
  const existingRow = existing.rows[0] as
    {id: string; updated_at: string | Date} | undefined;
  if (!existingRow) {
    return {error: 'Meal not found', status: 404};
  }
  // Optimistic concurrency (#384): a client that read the meal and merged
  // sends its `updatedAt` back as expectedUpdatedAt; if the stored record
  // has moved since that read, refuse before any write so the caller can
  // re-read, re-merge, and retry instead of silently overwriting.
  if (
    input.expectedUpdatedAt &&
    !updatedAtMatches(existingRow.updated_at, input.expectedUpdatedAt)
  ) {
    return staleWriteConflict('Meal');
  }

  const resolved: {recipeId: string; servings: number; sortOrder: number}[] =
    [];
  for (const [index, recipe] of input.recipes.entries()) {
    const accessible = await loadAccessibleRecipe(
      recipe.recipeId,
      userId,
      queryFn,
    );
    if (!accessible) {
      return {
        error: `Recipe not found or not accessible: ${recipe.recipeId}`,
        status: 400,
      };
    }
    resolved.push({
      recipeId: recipe.recipeId,
      servings: recipe.servings ?? accessible.servings,
      sortOrder: index,
    });
  }

  await queryFn(
    `update meals set title = $3, notes = $4, updated_at = now()
     where id = $1 and user_id = $2`,
    [mealId, userId, input.title, input.notes ?? null],
  );
  await queryFn(`delete from meal_recipes where meal_id = $1`, [mealId]);
  for (const recipe of resolved) {
    await queryFn(
      `insert into meal_recipes (meal_id, recipe_id, sort_order, servings)
       values ($1, $2, $3, $4)`,
      [mealId, recipe.recipeId, recipe.sortOrder, recipe.servings],
    );
  }

  const meal = await loadMealDetail(mealId, userId, queryFn);
  if (!meal) {
    return {error: 'Failed to load meal', status: 500};
  }
  return {meal};
};

export const deleteMeal = async (
  mealId: string,
  userId: string,
  queryFn: QueryFn = defaultQuery,
): Promise<{ok: true} | {error: string; status: number}> => {
  const referenced = await queryFn(
    `select 1 from meal_plan_entries where meal_id = $1 limit 1`,
    [mealId],
  );
  if (referenced.rows[0]) {
    return {error: 'Meal is referenced by a meal plan', status: 409};
  }

  const result = await queryFn(
    `delete from meals where id = $1 and user_id = $2`,
    [mealId, userId],
  );
  if (result.rowCount === 0) {
    return {error: 'Meal not found', status: 404};
  }
  return {ok: true};
};

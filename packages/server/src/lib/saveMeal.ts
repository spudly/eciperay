import type {MealDetail, MealInput} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';
import {runTransactional} from '../db/withTransaction.js';

import {
  staleWriteConflict,
  updatedAtMatches,
  updatedAtToken,
} from './conditionalWrite.js';
import {loadMealDetail} from './loadMealDetail.js';
import {loadAccessibleRecipe} from './mealRecipeAccess.js';

type QueryFn = typeof defaultQuery;

/**
 * Thrown inside the replace transaction when the saved meal cannot be read
 * back, so the writes roll back instead of leaving a meal the client was told
 * had not saved. Caught by replaceMeal and reported as the existing 500 result
 * (mirrors MealPlanLoadError in saveMealPlan.ts).
 */
class MealLoadError extends Error {
  constructor() {
    super('Failed to load meal');
    this.name = 'MealLoadError';
  }
}

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

  // The token is bound into the UPDATE itself, so the check above is only
  // a fast path: if a concurrent write lands between it and this update,
  // the predicate no longer matches and the update writes no row. The
  // comparison truncates the stored timestamp to milliseconds because
  // that is the precision of the token the API hands out (a stored
  // timestamptz can carry microseconds). The early check guarantees any
  // token reaching this cast has already normalized to a real timestamp,
  // so a malformed token cannot get here — it 409s above. Without a
  // token the predicate is null and the write stays unconditional.
  const expectedUpdatedAt = input.expectedUpdatedAt
    ? updatedAtToken(input.expectedUpdatedAt)
    : null;

  // Update, member delete, member inserts, and the read-back run in one
  // transaction (mirrors replaceMealPlan): a failure midway cannot leave
  // the meal updated with its members deleted or partially replaced.
  let outcome: {meal: MealDetail} | {conflict: true};
  try {
    outcome = await runTransactional(queryFn, async q => {
      const updated = await q(
        `update meals set title = $3, notes = $4, updated_at = now()
         where id = $1 and user_id = $2
           and ($5::timestamptz is null
             or date_trunc('milliseconds', updated_at) = $5::timestamptz)`,
        [mealId, userId, input.title, input.notes ?? null, expectedUpdatedAt],
      );
      if (expectedUpdatedAt && updated.rowCount === 0) {
        // A concurrent write (or delete) won the race after the check
        // above; nothing else is written.
        return {conflict: true as const};
      }
      await q(`delete from meal_recipes where meal_id = $1`, [mealId]);
      for (const recipe of resolved) {
        await q(
          `insert into meal_recipes (meal_id, recipe_id, sort_order, servings)
           values ($1, $2, $3, $4)`,
          [mealId, recipe.recipeId, recipe.sortOrder, recipe.servings],
        );
      }
      const meal = await loadMealDetail(mealId, userId, q);
      if (!meal) {
        throw new MealLoadError();
      }
      return {meal};
    });
  } catch (error) {
    if (error instanceof MealLoadError) {
      return {error: 'Failed to load meal', status: 500};
    }
    throw error;
  }
  if ('conflict' in outcome) {
    return staleWriteConflict('Meal');
  }
  return {meal: outcome.meal};
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

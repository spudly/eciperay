import type {MealPlanDetail, MealPlanInput} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';
import {runTransactional} from '../db/withTransaction.js';

import {
  staleWriteConflict,
  updatedAtMatches,
  updatedAtToken,
} from './conditionalWrite.js';
import {loadMealPlanDetail} from './loadMealPlanDetail.js';
import {loadAccessibleRecipe} from './mealRecipeAccess.js';

type QueryFn = typeof defaultQuery;

/**
 * Thrown inside a save transaction when the saved plan cannot be read back, so
 * the writes roll back instead of leaving an orphan plan the client was told
 * had not saved. Caught by the save functions and reported as the existing 500
 * result.
 */
class MealPlanLoadError extends Error {
  constructor() {
    super('Failed to load meal plan');
    this.name = 'MealPlanLoadError';
  }
}

/**
 * Thrown inside the replace transaction when the conditional UPDATE matched no
 * row — a concurrent write landed between the early token check and the update
 * — so the transaction rolls back and replaceMealPlan reports the 409 conflict
 * instead of overwriting.
 */
class MealPlanWriteConflictError extends Error {
  constructor() {
    super('Meal plan has been modified since it was loaded');
    this.name = 'MealPlanWriteConflictError';
  }
}

type ResolvedEntry =
  | {kind: 'meal'; mealId: string; quantity: number; sortOrder: number}
  | {
      kind: 'recipe';
      recipeId: string;
      servings: number;
      quantity: number;
      sortOrder: number;
    };

const resolveEntries = async (
  userId: string,
  input: MealPlanInput,
  queryFn: QueryFn,
): Promise<{entries: ResolvedEntry[]} | {error: string; status: number}> => {
  const entries: ResolvedEntry[] = [];
  const seenMeals = new Set<string>();
  const seenRecipes = new Set<string>();

  for (const [index, entry] of input.entries.entries()) {
    if ('mealId' in entry) {
      if (seenMeals.has(entry.mealId)) {
        return {error: 'Duplicate meal in plan', status: 400};
      }
      const meal = await queryFn(
        `select id from meals where id = $1 and user_id = $2`,
        [entry.mealId, userId],
      );
      if (!meal.rows[0]) {
        return {error: `Meal not found: ${entry.mealId}`, status: 400};
      }
      seenMeals.add(entry.mealId);
      entries.push({
        kind: 'meal',
        mealId: entry.mealId,
        quantity: entry.quantity ?? 1,
        sortOrder: index,
      });
      continue;
    }

    if (seenRecipes.has(entry.recipeId)) {
      return {error: 'Duplicate recipe in plan', status: 400};
    }
    const recipe = await loadAccessibleRecipe(entry.recipeId, userId, queryFn);
    if (!recipe) {
      return {
        error: `Recipe not found or not accessible: ${entry.recipeId}`,
        status: 400,
      };
    }
    seenRecipes.add(entry.recipeId);
    entries.push({
      kind: 'recipe',
      recipeId: entry.recipeId,
      servings: entry.servings ?? recipe.servings,
      quantity: entry.quantity ?? 1,
      sortOrder: index,
    });
  }

  return {entries};
};

const insertEntries = async (
  planId: string,
  entries: ResolvedEntry[],
  queryFn: QueryFn,
) => {
  for (const entry of entries) {
    if (entry.kind === 'meal') {
      await queryFn(
        `insert into meal_plan_entries
           (meal_plan_id, sort_order, quantity, meal_id, recipe_id, servings)
         values ($1, $2, $3, $4, null, null)`,
        [planId, entry.sortOrder, entry.quantity, entry.mealId],
      );
      continue;
    }
    await queryFn(
      `insert into meal_plan_entries
         (meal_plan_id, sort_order, quantity, meal_id, recipe_id, servings)
       values ($1, $2, $3, null, $4, $5)`,
      [planId, entry.sortOrder, entry.quantity, entry.recipeId, entry.servings],
    );
  }
};

export const saveNewMealPlan = async (
  userId: string,
  input: MealPlanInput,
  queryFn: QueryFn = defaultQuery,
): Promise<{plan: MealPlanDetail} | {error: string; status: number}> => {
  const resolved = await resolveEntries(userId, input, queryFn);
  if ('error' in resolved) {
    return resolved;
  }

  // The plan row, its entries, and the read-back of the saved plan run
  // in one transaction. Before this, the writes were not atomic and the
  // read-back happened outside them: when loading the saved plan failed
  // (the #251 dateOnly throw), the API returned a 500 but the plan row
  // stayed — an orphan the client was told had not saved. Dated orphans
  // then 500ed every later plan-list load (#358/#360). Loading through
  // the transaction client means any failure rolls the whole save back.
  let plan: MealPlanDetail;
  try {
    plan = await runTransactional(queryFn, async q => {
      const planResult = await q(
        `insert into meal_plans (user_id, title, notes, starts_on, ends_on)
         values ($1, $2, $3, $4, $5)
         returning id`,
        [
          userId,
          input.title,
          input.notes ?? null,
          input.startsOn ?? null,
          input.endsOn ?? null,
        ],
      );
      const id = (planResult.rows[0] as {id: string}).id;
      await insertEntries(id, resolved.entries, q);
      const detail = await loadMealPlanDetail(id, userId, q);
      if (!detail) {
        throw new MealPlanLoadError();
      }
      return detail;
    });
  } catch (error) {
    if (error instanceof MealPlanLoadError) {
      return {error: 'Failed to load meal plan', status: 500};
    }
    throw error;
  }
  return {plan};
};

export const replaceMealPlan = async (
  planId: string,
  userId: string,
  input: MealPlanInput,
  queryFn: QueryFn = defaultQuery,
): Promise<{plan: MealPlanDetail} | {error: string; status: number}> => {
  const existing = await queryFn(
    `select id, updated_at from meal_plans where id = $1 and user_id = $2`,
    [planId, userId],
  );
  const existingRow = existing.rows[0] as
    {id: string; updated_at: string | Date} | undefined;
  if (!existingRow) {
    return {error: 'Meal plan not found', status: 404};
  }
  // Optimistic concurrency (#384): same contract as replaceMeal — a stale
  // expectedUpdatedAt refuses before any write, so a read-merge-PUT client
  // can re-read, re-merge, and retry instead of silently overwriting.
  if (
    input.expectedUpdatedAt &&
    !updatedAtMatches(existingRow.updated_at, input.expectedUpdatedAt)
  ) {
    return staleWriteConflict('Meal plan');
  }

  const resolved = await resolveEntries(userId, input, queryFn);
  if ('error' in resolved) {
    return resolved;
  }

  // Update, entry delete, entry inserts, and the read-back of the saved
  // plan are one transaction, so a failure midway cannot leave the plan
  // updated with its entries deleted or partially replaced, and a
  // failed read-back cannot leave the client told the save failed when
  // it landed (see saveNewMealPlan / #358).
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

  let plan: MealPlanDetail;
  try {
    plan = await runTransactional(queryFn, async q => {
      const updated = await q(
        `update meal_plans
       set title = $3, notes = $4, starts_on = $5, ends_on = $6, updated_at = now()
       where id = $1 and user_id = $2
         and ($7::timestamptz is null
           or date_trunc('milliseconds', updated_at) = $7::timestamptz)`,
        [
          planId,
          userId,
          input.title,
          input.notes ?? null,
          input.startsOn ?? null,
          input.endsOn ?? null,
          expectedUpdatedAt,
        ],
      );
      if (expectedUpdatedAt && updated.rowCount === 0) {
        throw new MealPlanWriteConflictError();
      }
      await q(`delete from meal_plan_entries where meal_plan_id = $1`, [
        planId,
      ]);
      await insertEntries(planId, resolved.entries, q);
      const detail = await loadMealPlanDetail(planId, userId, q);
      if (!detail) {
        throw new MealPlanLoadError();
      }
      return detail;
    });
  } catch (error) {
    if (error instanceof MealPlanLoadError) {
      return {error: 'Failed to load meal plan', status: 500};
    }
    if (error instanceof MealPlanWriteConflictError) {
      return staleWriteConflict('Meal plan');
    }
    throw error;
  }
  return {plan};
};

export const deleteMealPlan = async (
  planId: string,
  userId: string,
  queryFn: QueryFn = defaultQuery,
): Promise<{ok: true} | {error: string; status: number}> => {
  const result = await queryFn(
    `delete from meal_plans where id = $1 and user_id = $2`,
    [planId, userId],
  );
  if (result.rowCount === 0) {
    return {error: 'Meal plan not found', status: 404};
  }
  return {ok: true};
};

import type {MealPlanDetail, MealPlanInput} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';

import {loadMealPlanDetail} from './loadMealPlanDetail.js';
import {loadAccessibleRecipe} from './mealRecipeAccess.js';

type QueryFn = typeof defaultQuery;

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

  const planResult = await queryFn(
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
  const planId = (planResult.rows[0] as {id: string}).id;
  await insertEntries(planId, resolved.entries, queryFn);

  const plan = await loadMealPlanDetail(planId, userId, queryFn);
  if (!plan) {
    return {error: 'Failed to load meal plan', status: 500};
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
    `select id from meal_plans where id = $1 and user_id = $2`,
    [planId, userId],
  );
  if (!existing.rows[0]) {
    return {error: 'Meal plan not found', status: 404};
  }

  const resolved = await resolveEntries(userId, input, queryFn);
  if ('error' in resolved) {
    return resolved;
  }

  await queryFn(
    `update meal_plans
     set title = $3, notes = $4, starts_on = $5, ends_on = $6, updated_at = now()
     where id = $1 and user_id = $2`,
    [
      planId,
      userId,
      input.title,
      input.notes ?? null,
      input.startsOn ?? null,
      input.endsOn ?? null,
    ],
  );
  await queryFn(`delete from meal_plan_entries where meal_plan_id = $1`, [
    planId,
  ]);
  await insertEntries(planId, resolved.entries, queryFn);

  const plan = await loadMealPlanDetail(planId, userId, queryFn);
  if (!plan) {
    return {error: 'Failed to load meal plan', status: 500};
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

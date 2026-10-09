import type {
  MealPlanDetail,
  MealPlanEntry,
  MealPlanNutrition,
  NutritionStatus,
} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';

import {
  aggregatePlanNutrition,
  planDayCount,
} from './aggregateRecipePortionsNutrition.js';
import {comparePlanToGoals} from './comparePlanToGoals.js';
import {loadMealDetail} from './loadMealDetail.js';
import {
  loadAccessibleRecipe,
  loadRecipeRowIgnoringAccess,
  type AccessibleRecipeRow,
} from './mealRecipeAccess.js';
import {fetchNutritionGoals} from './nutritionGoalsQueries.js';
import {canReadRecipe, toRecipeAccessRecord} from './recipeAccess.js';
import {userHasShareGrant} from './shareGrant.js';

type QueryFn = typeof defaultQuery;

const PLAN_SQL = `
  select id, user_id, title, notes, starts_on, ends_on, created_at, updated_at
  from meal_plans
  where id = $1 and user_id = $2
`;

const ENTRIES_SQL = `
  select id, meal_plan_id, sort_order, quantity, meal_id, recipe_id, servings
  from meal_plan_entries
  where meal_plan_id = $1
  order by sort_order asc, id asc
`;

type PlanRow = {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  starts_on: string | null;
  ends_on: string | null;
  created_at: string;
  updated_at: string;
};

type EntryRow = {
  id: string;
  meal_plan_id: string;
  sort_order: number;
  quantity: number;
  meal_id: string | null;
  recipe_id: string | null;
  servings: number | null;
};

const dateOnly = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  return value.slice(0, 10);
};

const recipeEntryNutrition = (
  recipe: AccessibleRecipeRow,
  servings: number,
  accessLost: boolean,
) =>
  aggregatePlanNutrition(
    [
      {
        kind: 'portions',
        quantity: 1,
        portions: [
          {
            servings,
            recipeServings: recipe.servings,
            calories: recipe.calories,
            proteinG: recipe.protein_g,
            carbsG: recipe.carbs_g,
            fatG: recipe.fat_g,
            fiberG: recipe.fiber_g,
            sugarG: recipe.sugar_g,
            sodiumMg: recipe.sodium_mg,
            preparedWeightG: recipe.prepared_weight_g,
            nutritionStatus: recipe.nutrition_status,
            accessLost,
          },
        ],
      },
    ],
    null,
  );

export const loadMealPlanDetail = async (
  planId: string,
  userId: string,
  queryFn: QueryFn = defaultQuery,
): Promise<MealPlanDetail | null> => {
  const planResult = await queryFn(PLAN_SQL, [planId, userId]);
  const plan = planResult.rows[0] as PlanRow | undefined;
  if (!plan) {
    return null;
  }

  const entriesResult = await queryFn(ENTRIES_SQL, [planId]);
  const entryRows = entriesResult.rows as EntryRow[];
  const entries: MealPlanEntry[] = [];
  const planNutritionInputs: Parameters<typeof aggregatePlanNutrition>[0] = [];

  for (const row of entryRows) {
    if (row.meal_id) {
      const meal = await loadMealDetail(row.meal_id, userId, queryFn);
      if (!meal) {
        continue;
      }
      entries.push({
        type: 'meal',
        id: row.id,
        mealId: row.meal_id,
        sortOrder: row.sort_order,
        quantity: row.quantity,
        title: meal.title,
        memberCount: meal.memberCount,
        nutrition: meal.nutrition,
      });
      if (meal.nutrition) {
        planNutritionInputs.push({
          kind: 'aggregated',
          nutrition: meal.nutrition,
          quantity: row.quantity,
        });
      }
      continue;
    }

    if (!row.recipe_id) {
      continue;
    }

    const accessible = await loadAccessibleRecipe(
      row.recipe_id,
      userId,
      queryFn,
    );
    const raw =
      accessible ?? (await loadRecipeRowIgnoringAccess(row.recipe_id, queryFn));
    const hasShareGrant = await userHasShareGrant(
      row.recipe_id,
      userId,
      queryFn,
    );
    const accessLost =
      !accessible ||
      !raw ||
      !canReadRecipe(toRecipeAccessRecord(raw), {userId, hasShareGrant});
    const servings = row.servings ?? raw?.servings ?? 1;
    const nutrition = raw
      ? recipeEntryNutrition(raw, servings, accessLost)
      : null;
    const readableRecipe = accessLost ? null : raw;
    const nutritionStatus = (readableRecipe?.nutrition_status ??
      null) as NutritionStatus | null;

    entries.push({
      type: 'recipe',
      id: row.id,
      recipeId: row.recipe_id,
      sortOrder: row.sort_order,
      quantity: row.quantity,
      servings,
      title: raw?.title ?? 'Unavailable recipe',
      imageUrl: raw?.image_url ?? null,
      recipeServings: raw?.servings ?? servings,
      accessLost,
      nutrition,
      satietyScore: readableRecipe?.satiety_score ?? null,
      nutritionStatus,
      calories: readableRecipe?.calories ?? null,
      proteinG: readableRecipe?.protein_g ?? null,
    });

    if (nutrition) {
      planNutritionInputs.push({
        kind: 'aggregated',
        nutrition,
        quantity: row.quantity,
      });
    }
  }

  const startsOn = dateOnly(plan.starts_on);
  const endsOn = dateOnly(plan.ends_on);
  const dayCount = planDayCount(startsOn, endsOn);
  const nutrition: MealPlanNutrition = aggregatePlanNutrition(
    planNutritionInputs,
    dayCount,
  );
  const goals = await fetchNutritionGoals(userId, queryFn);
  const goalProgress = comparePlanToGoals(nutrition, goals);

  return {
    id: plan.id,
    userId: plan.user_id,
    title: plan.title,
    notes: plan.notes,
    startsOn,
    endsOn,
    entryCount: entries.length,
    nutrition,
    goalProgress,
    createdAt: plan.created_at,
    updatedAt: plan.updated_at,
    entries,
  };
};

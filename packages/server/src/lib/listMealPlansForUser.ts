import type {
  AggregatedNutrition,
  MealIngredientMember,
  MealPlan,
  MealRecipeMember,
} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';

import {
  aggregatePlanNutrition,
  planDayCount,
} from './aggregateRecipePortionsNutrition.js';
import {comparePlanToGoals} from './comparePlanToGoals.js';
import {nutritionFromMembers} from './loadMealDetail.js';
import type {AccessibleRecipeRow} from './mealRecipeAccess.js';
import {fetchNutritionGoals} from './nutritionGoalsQueries.js';
import {canReadRecipe, toRecipeAccessRecord} from './recipeAccess.js';

type QueryFn = typeof defaultQuery;

/**
 * Meal-plan list summaries (#644).
 *
 * This module used to call `loadMealPlanDetail` once per plan in a sequential
 * loop and discard the entries it had just loaded — an N+1 whose cost grew with
 * plans × entries. The summary path now loads everything it needs in a small
 * CONSTANT number of batched queries (plans, entries, meals, meal members, meal
 * ingredients, recipes, share access, nutrition goals — at most one query each,
 * regardless of how many plans or entries the user has), groups the rows in
 * memory, and recomputes each plan's summary with the same aggregation helpers
 * the detail path uses, so the summaries are identical to the ones the old
 * detail-based code returned. `loadMealPlanDetail` remains the detail
 * endpoint's loader only; nothing here calls it.
 */

const PLANS_SQL = `
  select id, user_id, title, notes, starts_on, ends_on, created_at, updated_at
  from meal_plans
  where user_id = $1
  order by updated_at desc
`;

const ENTRIES_SQL = `
  select id, meal_plan_id, sort_order, quantity, meal_id, recipe_id, servings, servings_to_eat, day
  from meal_plan_entries
  where meal_plan_id = any($1)
  order by meal_plan_id asc, sort_order asc, id asc
`;

const MEALS_SQL = `
  select id, user_id, title, notes, created_at, updated_at
  from meals
  where id = any($1) and user_id = $2
`;

const MEAL_RECIPES_SQL = `
  select meal_id, recipe_id, sort_order, servings, servings_to_eat
  from meal_recipes
  where meal_id = any($1)
  order by meal_id asc, sort_order asc, recipe_id asc
`;

const MEAL_INGREDIENTS_SQL = `
  select meal_id, name, quantity, unit, servings, servings_to_eat, sort_order,
         calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg,
         prepared_weight_g, satiety_score, nutrition_status
  from meal_ingredients
  where meal_id = any($1)
  order by meal_id asc, sort_order asc, name asc
`;

// Same recipe projection as mealRecipeAccess's RECIPE_ACCESS_SQL, batched.
const RECIPES_SQL = `
  select r.id, r.user_id, r.visibility, r.share_token_hash,
         rv.id as version_id, rv.servings, rv.title, rv.image_url,
         rv.calories, rv.protein_g, rv.carbs_g, rv.fat_g,
         rv.fiber_g, rv.sugar_g, rv.sodium_mg, rv.prepared_weight_g,
         rv.satiety_score, rv.nutrition_status, rv.step_timing_status
  from recipes r
  join recipe_versions rv on rv.id = r.active_version_id
  where r.id = any($1)
`;

// Batched form of shareGrant's HAS_SHARE_ACCESS_SQL: the recipe ids (of
// the ones asked about) this user can reach through either a per-recipe
// grant or a standing family grant from the recipe's owner.
const SHARE_ACCESS_SQL = `
  select r.id as recipe_id
  from recipes r
  where r.id = any($1)
    and (
      exists (
        select 1 from recipe_share_grants
        where recipe_id = r.id and user_id = $2
      )
      or exists (
        select 1
        from family_share_grants fg
        where fg.owner_user_id = r.user_id and fg.recipient_user_id = $2
      )
    )
`;

type PlanRow = {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  // DATE / timestamptz columns arrive as JS Date objects from
  // node-postgres (see dateOnly / timestampString in loadMealPlanDetail).
  starts_on: string | Date | null;
  ends_on: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type EntryRow = {
  id: string;
  meal_plan_id: string;
  sort_order: number;
  quantity: number;
  meal_id: string | null;
  recipe_id: string | null;
  servings: number | null;
  // numeric column: node-postgres returns it as a string (see #541).
  servings_to_eat: number | string | null;
  day: string | Date | null;
};

type MealRecipeRow = {
  meal_id: string;
  recipe_id: string;
  sort_order: number;
  servings: number;
  servings_to_eat: number | string;
};

type MealIngredientRow = {
  meal_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  servings: number;
  servings_to_eat: number | string;
  sort_order: number;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  prepared_weight_g: number | null;
  satiety_score: number | null;
  nutrition_status: string | null;
};

const dateOnly = (value: string | Date | null): string | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }
  return value.slice(0, 10);
};

const timestampString = (value: string | Date): string =>
  value instanceof Date ? value.toISOString() : value;

// Mirrors loadMealDetail's eatServings (#541): a stored "0" is a real
// value; only a missing value falls back to servings-to-cook.
const eatServings = (
  value: number | string | null | undefined,
  servingsToCook: number,
): number => (value == null ? servingsToCook : Number(value));

// Mirrors loadMealDetail's toIngredientMember.
const toIngredientMember = (row: MealIngredientRow): MealIngredientMember => ({
  name: row.name,
  quantity: row.quantity,
  unit: row.unit,
  sortOrder: row.sort_order,
  servingsToCook: row.servings,
  servingsToEat: eatServings(row.servings_to_eat, row.servings),
  satietyScore: row.satiety_score,
  nutritionStatus:
    (row.nutrition_status as MealIngredientMember['nutritionStatus']) ?? null,
  calories: row.calories,
  proteinG: row.protein_g,
  carbsG: row.carbs_g,
  fatG: row.fat_g,
  fiberG: row.fiber_g,
  sugarG: row.sugar_g,
  sodiumMg: row.sodium_mg,
  preparedWeightG: row.prepared_weight_g,
});

// Mirrors loadMealDetail's toMember.
const toMember = (
  row: MealRecipeRow,
  recipe: AccessibleRecipeRow | null,
  accessLost: boolean,
): MealRecipeMember => ({
  recipeId: row.recipe_id,
  sortOrder: row.sort_order,
  servingsToCook: row.servings,
  servingsToEat: eatServings(row.servings_to_eat, row.servings),
  title: recipe?.title ?? 'Unavailable recipe',
  imageUrl: recipe?.image_url ?? null,
  recipeServings: recipe?.servings ?? row.servings,
  accessLost,
  satietyScore: accessLost ? null : (recipe?.satiety_score ?? null),
  nutritionStatus: accessLost
    ? null
    : ((recipe?.nutrition_status as MealRecipeMember['nutritionStatus']) ??
      null),
  calories: accessLost ? null : (recipe?.calories ?? null),
  proteinG: accessLost ? null : (recipe?.protein_g ?? null),
  carbsG: accessLost ? null : (recipe?.carbs_g ?? null),
  fatG: accessLost ? null : (recipe?.fat_g ?? null),
  fiberG: accessLost ? null : (recipe?.fiber_g ?? null),
});

// Mirrors loadMealPlanDetail's recipeEntryNutrition: the eaten nutrition
// of one recipe entry, as an aggregated plan input.
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

const groupBy = <T>(rows: T[], key: (row: T) => string): Map<string, T[]> => {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const rowsForKey = grouped.get(key(row));
    if (rowsForKey) {
      rowsForKey.push(row);
    } else {
      grouped.set(key(row), [row]);
    }
  }
  return grouped;
};

export const listMealPlansForUser = async (
  userId: string,
  queryFn: QueryFn = defaultQuery,
): Promise<MealPlan[]> => {
  const plansResult = await queryFn(PLANS_SQL, [userId]);
  const planRows = plansResult.rows as PlanRow[];
  if (planRows.length === 0) {
    return [];
  }
  const planIds = planRows.map(plan => plan.id);

  const entriesResult = await queryFn(ENTRIES_SQL, [planIds]);
  const entryRows = entriesResult.rows as EntryRow[];
  const entriesByPlan = groupBy(entryRows, row => row.meal_plan_id);

  const mealIds = [
    ...new Set(entryRows.flatMap(row => (row.meal_id ? [row.meal_id] : []))),
  ];
  const existingMealIds = new Set<string>();
  const memberRowsByMeal = new Map<string, MealRecipeRow[]>();
  const ingredientRowsByMeal = new Map<string, MealIngredientRow[]>();
  if (mealIds.length > 0) {
    const mealsResult = await queryFn(MEALS_SQL, [mealIds, userId]);
    for (const row of mealsResult.rows as {id: string}[]) {
      existingMealIds.add(row.id);
    }
    const membersResult = await queryFn(MEAL_RECIPES_SQL, [mealIds]);
    for (const [mealId, rows] of groupBy(
      membersResult.rows as MealRecipeRow[],
      row => row.meal_id,
    )) {
      memberRowsByMeal.set(mealId, rows);
    }
    const ingredientsResult = await queryFn(MEAL_INGREDIENTS_SQL, [mealIds]);
    for (const [mealId, rows] of groupBy(
      ingredientsResult.rows as MealIngredientRow[],
      row => row.meal_id,
    )) {
      ingredientRowsByMeal.set(mealId, rows);
    }
  }

  const recipeIds = [
    ...new Set([
      ...entryRows.flatMap(row => (row.recipe_id ? [row.recipe_id] : [])),
      ...[...memberRowsByMeal.values()].flatMap(rows =>
        rows.map(row => row.recipe_id),
      ),
    ]),
  ];
  const recipesById = new Map<string, AccessibleRecipeRow>();
  const shareAccessRecipeIds = new Set<string>();
  if (recipeIds.length > 0) {
    const recipesResult = await queryFn(RECIPES_SQL, [recipeIds]);
    for (const row of recipesResult.rows as AccessibleRecipeRow[]) {
      recipesById.set(row.id, row);
    }
    const shareResult = await queryFn(SHARE_ACCESS_SQL, [recipeIds, userId]);
    for (const row of shareResult.rows as {recipe_id: string}[]) {
      shareAccessRecipeIds.add(row.recipe_id);
    }
  }

  const canRead = (recipe: AccessibleRecipeRow): boolean =>
    canReadRecipe(toRecipeAccessRecord(recipe), {
      userId,
      hasShareGrant: shareAccessRecipeIds.has(recipe.id),
    });

  // Each referenced meal's nutrition, computed once per meal (a meal can
  // be referenced by several plans / entries) from its batched members
  // and ingredients — the same inputs loadMealDetail aggregates.
  const mealNutritionById = new Map<string, AggregatedNutrition>();
  const mealNutrition = (mealId: string): AggregatedNutrition => {
    const cached = mealNutritionById.get(mealId);
    if (cached) {
      return cached;
    }
    const members = (memberRowsByMeal.get(mealId) ?? []).map(row => {
      const raw = recipesById.get(row.recipe_id) ?? null;
      const accessLost = raw ? !canRead(raw) : true;
      return toMember(row, raw, accessLost);
    });
    const ingredients = (ingredientRowsByMeal.get(mealId) ?? []).map(
      toIngredientMember,
    );
    const nutrition = nutritionFromMembers(members, recipesById, ingredients);
    mealNutritionById.set(mealId, nutrition);
    return nutrition;
  };

  const goals = await fetchNutritionGoals(userId, queryFn);

  const plans: MealPlan[] = [];
  for (const plan of planRows) {
    const planNutritionInputs: Parameters<typeof aggregatePlanNutrition>[0] =
      [];
    let entryCount = 0;

    for (const row of entriesByPlan.get(plan.id) ?? []) {
      if (row.meal_id) {
        // Matches loadMealPlanDetail: an entry whose meal is missing (or
        // not the user's) is skipped entirely — not counted, no nutrition.
        if (!existingMealIds.has(row.meal_id)) {
          continue;
        }
        entryCount += 1;
        planNutritionInputs.push({
          kind: 'aggregated',
          nutrition: mealNutrition(row.meal_id),
          quantity: row.quantity,
        });
        continue;
      }

      if (!row.recipe_id) {
        continue;
      }
      entryCount += 1;

      const raw = recipesById.get(row.recipe_id) ?? null;
      const accessLost = !raw || !canRead(raw);
      const servingsToCook = row.servings ?? raw?.servings ?? 1;
      const servingsToEat =
        row.servings_to_eat == null
          ? servingsToCook
          : Number(row.servings_to_eat);
      const nutrition = raw
        ? recipeEntryNutrition(raw, servingsToEat, accessLost)
        : null;
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
    const nutrition = aggregatePlanNutrition(
      planNutritionInputs,
      planDayCount(startsOn, endsOn),
    );

    plans.push({
      id: plan.id,
      userId: plan.user_id,
      title: plan.title,
      notes: plan.notes,
      startsOn,
      endsOn,
      entryCount,
      nutrition,
      goalProgress: comparePlanToGoals(nutrition, goals),
      createdAt: timestampString(plan.created_at),
      updatedAt: timestampString(plan.updated_at),
    });
  }
  return plans;
};

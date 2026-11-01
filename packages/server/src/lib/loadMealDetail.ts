import type {
  AggregatedNutrition,
  MealDetail,
  MealRecipeMember,
} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';

import {aggregateRecipePortionsNutrition} from './aggregateRecipePortionsNutrition.js';
import {
  loadAccessibleRecipe,
  loadRecipeRowIgnoringAccess,
  type AccessibleRecipeRow,
} from './mealRecipeAccess.js';
import {canReadRecipe, toRecipeAccessRecord} from './recipeAccess.js';
import {userHasShareGrant} from './shareGrant.js';

type QueryFn = typeof defaultQuery;

const MEAL_SQL = `
  select id, user_id, title, notes, created_at, updated_at
  from meals
  where id = $1 and user_id = $2
`;

const MEAL_RECIPES_SQL = `
  select meal_id, recipe_id, sort_order, servings
  from meal_recipes
  where meal_id = $1
  order by sort_order asc, recipe_id asc
`;

type MealRow = {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  // node-postgres returns timestamptz columns as JS Date objects; the
  // detail type declares strings, so both representations are admitted
  // here and normalized in loadMealDetail (see timestampString).
  created_at: string | Date;
  updated_at: string | Date;
};

/**
 * Normalize a timestamptz value to the ISO string the detail types declare. A
 * timestamp's instant is unambiguous, so `toISOString()` is the correct
 * conversion for Date instances.
 */
const timestampString = (value: string | Date): string =>
  value instanceof Date ? value.toISOString() : value;

type MealRecipeRow = {
  meal_id: string;
  recipe_id: string;
  sort_order: number;
  servings: number;
};

const toMember = (
  row: MealRecipeRow,
  recipe: AccessibleRecipeRow | null,
  accessLost: boolean,
): MealRecipeMember => ({
  recipeId: row.recipe_id,
  sortOrder: row.sort_order,
  servings: row.servings,
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
});

export const nutritionFromMembers = (
  members: MealRecipeMember[],
  recipesById: Map<string, AccessibleRecipeRow>,
): AggregatedNutrition =>
  aggregateRecipePortionsNutrition(
    members.map(member => {
      const recipe = recipesById.get(member.recipeId);
      return {
        servings: member.servings,
        recipeServings: member.recipeServings,
        calories: recipe?.calories ?? null,
        proteinG: recipe?.protein_g ?? null,
        carbsG: recipe?.carbs_g ?? null,
        fatG: recipe?.fat_g ?? null,
        fiberG: recipe?.fiber_g ?? null,
        sugarG: recipe?.sugar_g ?? null,
        sodiumMg: recipe?.sodium_mg ?? null,
        preparedWeightG: recipe?.prepared_weight_g ?? null,
        nutritionStatus: recipe?.nutrition_status ?? null,
        accessLost: member.accessLost,
      };
    }),
  );

export const loadMealDetail = async (
  mealId: string,
  userId: string,
  queryFn: QueryFn = defaultQuery,
): Promise<MealDetail | null> => {
  const mealResult = await queryFn(MEAL_SQL, [mealId, userId]);
  const meal = mealResult.rows[0] as MealRow | undefined;
  if (!meal) {
    return null;
  }

  const membersResult = await queryFn(MEAL_RECIPES_SQL, [mealId]);
  const memberRows = membersResult.rows as MealRecipeRow[];
  const recipesById = new Map<string, AccessibleRecipeRow>();
  const members: MealRecipeMember[] = [];

  for (const row of memberRows) {
    const accessible = await loadAccessibleRecipe(
      row.recipe_id,
      userId,
      queryFn,
    );
    if (accessible) {
      recipesById.set(row.recipe_id, accessible);
      members.push(toMember(row, accessible, false));
      continue;
    }
    const raw = await loadRecipeRowIgnoringAccess(row.recipe_id, queryFn);
    if (raw) {
      recipesById.set(row.recipe_id, raw);
    }
    const hasShareGrant = await userHasShareGrant(
      row.recipe_id,
      userId,
      queryFn,
    );
    const accessLost = raw
      ? !canReadRecipe(toRecipeAccessRecord(raw), {userId, hasShareGrant})
      : true;
    members.push(toMember(row, raw, accessLost));
  }

  const nutrition = nutritionFromMembers(members, recipesById);

  return {
    id: meal.id,
    userId: meal.user_id,
    title: meal.title,
    notes: meal.notes,
    memberCount: members.length,
    nutrition,
    createdAt: timestampString(meal.created_at),
    updatedAt: timestampString(meal.updated_at),
    members,
  };
};

export const listMealsForUser = async (
  userId: string,
  queryFn: QueryFn = defaultQuery,
) => {
  const result = await queryFn(
    `select id from meals where user_id = $1 order by updated_at desc`,
    [userId],
  );
  const meals = [];
  for (const row of result.rows as {id: string}[]) {
    const detail = await loadMealDetail(row.id, userId, queryFn);
    if (detail) {
      const {members: _members, ...summary} = detail;
      meals.push(summary);
    }
  }
  return meals;
};

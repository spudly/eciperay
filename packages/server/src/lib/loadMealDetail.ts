import type {
  AggregatedNutrition,
  MealDetail,
  MealIngredientMember,
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

const MEAL_INGREDIENTS_SQL = `
  select meal_id, name, quantity, unit, servings, sort_order,
         calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg,
         prepared_weight_g, satiety_score, nutrition_status
  from meal_ingredients
  where meal_id = $1
  order by sort_order asc, name asc
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

type MealIngredientRow = {
  meal_id: string;
  name: string;
  // node-postgres returns numeric/double columns as numbers for
  // double precision; quantity is a double precision column (021).
  quantity: number | null;
  unit: string | null;
  servings: number;
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

const toIngredientMember = (row: MealIngredientRow): MealIngredientMember => ({
  name: row.name,
  quantity: row.quantity,
  unit: row.unit,
  sortOrder: row.sort_order,
  servings: row.servings,
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
  carbsG: accessLost ? null : (recipe?.carbs_g ?? null),
  fatG: accessLost ? null : (recipe?.fat_g ?? null),
});

export const nutritionFromMembers = (
  members: MealRecipeMember[],
  recipesById: Map<string, AccessibleRecipeRow>,
  ingredients: MealIngredientMember[] = [],
): AggregatedNutrition =>
  aggregateRecipePortionsNutrition([
    ...members.map(member => {
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
    // Direct ingredients (#362): stored macros are per serving (the
    // recipe shape), so an entry contributes per-serving × its own
    // entry-level servings. Its stored prepared weight already covers
    // the whole entry, so the portion's recipeServings equals its
    // servings and the weight scale is 1.
    ...ingredients.map(ingredient => ({
      servings: ingredient.servings,
      recipeServings: ingredient.servings,
      calories: ingredient.calories,
      proteinG: ingredient.proteinG,
      carbsG: ingredient.carbsG,
      fatG: ingredient.fatG,
      fiberG: ingredient.fiberG,
      sugarG: ingredient.sugarG,
      sodiumMg: ingredient.sodiumMg,
      preparedWeightG: ingredient.preparedWeightG,
      nutritionStatus: ingredient.nutritionStatus,
    })),
  ]);

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
  const ingredientsResult = await queryFn(MEAL_INGREDIENTS_SQL, [mealId]);
  const ingredients = (ingredientsResult.rows as MealIngredientRow[]).map(
    toIngredientMember,
  );
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

  const nutrition = nutritionFromMembers(members, recipesById, ingredients);

  return {
    id: meal.id,
    userId: meal.user_id,
    title: meal.title,
    notes: meal.notes,
    // Member count covers both kinds of member (#362): a direct-only
    // meal is not a zero-member meal.
    memberCount: members.length + ingredients.length,
    // Recipe-only count (#498): surfaces that label the count "recipes"
    // must not fold direct ingredients into it.
    recipeCount: members.length,
    nutrition,
    createdAt: timestampString(meal.created_at),
    updatedAt: timestampString(meal.updated_at),
    members,
    ingredients,
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
      const {members: _members, ingredients: _ingredients, ...summary} = detail;
      meals.push(summary);
    }
  }
  return meals;
};

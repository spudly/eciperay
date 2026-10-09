import type {NutritionInfo, NutritionStatus} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';

type QueryFn = typeof defaultQuery;

export type VersionNutritionRow = {
  version_id: string;
  recipe_id: string;
  servings: number;
  title: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  prepared_weight_g: number | null;
  satiety_score: number | null;
  nutrition_status: NutritionStatus | null;
  nutrition_disclaimer: string | null;
  nutrition_updated_at: string | null;
};

export type VersionIngredientRow = {
  name: string;
  quantity: number | null;
  unit: string | null;
};

export const GET_VERSION_NUTRITION_SQL = `
  select rv.id as version_id, rv.recipe_id, rv.servings, rv.title,
         rv.calories, rv.protein_g, rv.carbs_g, rv.fat_g, rv.fiber_g,
         rv.sugar_g, rv.sodium_mg, rv.prepared_weight_g, rv.satiety_score,
         rv.nutrition_status, rv.nutrition_disclaimer, rv.nutrition_updated_at
  from recipe_versions rv
  where rv.id = $1
`;

export const GET_VERSION_INGREDIENTS_SQL = `
  select i.name, i.quantity, i.unit
  from ingredients i
  where i.recipe_version_id = $1
  order by i.sort_order
`;

export const SET_NUTRITION_PENDING_SQL = `
  update recipe_versions
  set nutrition_status = 'pending',
      nutrition_updated_at = now()
  where id = $1
`;

export const SET_NUTRITION_FAILED_SQL = `
  update recipe_versions
  set nutrition_status = 'failed',
      nutrition_updated_at = now()
  where id = $1
`;

export const UPDATE_VERSION_NUTRITION_SQL = `
  update recipe_versions
  set calories = $2,
      protein_g = $3,
      carbs_g = $4,
      fat_g = $5,
      fiber_g = $6,
      sugar_g = $7,
      sodium_mg = $8,
      prepared_weight_g = $9,
      satiety_score = $10,
      nutrition_status = 'ready',
      nutrition_disclaimer = $11,
      nutrition_updated_at = now()
  where id = $1
`;

export const mapRowToNutritionInfo = (
  row: VersionNutritionRow,
): NutritionInfo | null => {
  if (
    row.nutrition_status !== 'ready' ||
    typeof row.calories !== 'number' ||
    typeof row.protein_g !== 'number' ||
    typeof row.carbs_g !== 'number' ||
    typeof row.fat_g !== 'number' ||
    typeof row.prepared_weight_g !== 'number' ||
    typeof row.satiety_score !== 'number'
  ) {
    return null;
  }
  return {
    servings: row.servings,
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    fiberG: row.fiber_g,
    sugarG: row.sugar_g,
    sodiumMg: row.sodium_mg,
    preparedWeightG: row.prepared_weight_g,
    disclaimer: row.nutrition_disclaimer ?? '',
    satietyScore: row.satiety_score,
    status: 'ready',
  };
};

export const fetchVersionNutrition = async (
  versionId: string,
  queryFn: QueryFn,
): Promise<VersionNutritionRow | null> => {
  const result = await queryFn(GET_VERSION_NUTRITION_SQL, [versionId]);
  const row = result.rows[0] as VersionNutritionRow | undefined;
  return row ?? null;
};

export const fetchVersionIngredients = async (
  versionId: string,
  queryFn: QueryFn,
): Promise<VersionIngredientRow[]> => {
  const result = await queryFn(GET_VERSION_INGREDIENTS_SQL, [versionId]);
  return result.rows as VersionIngredientRow[];
};

export const markNutritionPending = async (
  versionId: string,
  queryFn: QueryFn,
) => {
  await queryFn(SET_NUTRITION_PENDING_SQL, [versionId]);
};

export const markNutritionFailed = async (
  versionId: string,
  queryFn: QueryFn,
) => {
  await queryFn(SET_NUTRITION_FAILED_SQL, [versionId]);
};

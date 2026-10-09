import type {
  NutritionInfo,
  NutritionStatus,
  RecipeCommunityRating,
  RecipeNutritionSummary,
} from '@eciperay/types';

import {
  mapRowToNutritionInfo,
  type VersionNutritionRow,
} from './nutritionQueries.js';

export type NutritionColumns = Pick<
  VersionNutritionRow,
  | 'calories'
  | 'protein_g'
  | 'carbs_g'
  | 'fat_g'
  | 'fiber_g'
  | 'sugar_g'
  | 'sodium_mg'
  | 'prepared_weight_g'
  | 'satiety_score'
  | 'nutrition_status'
  | 'nutrition_disclaimer'
  | 'nutrition_updated_at'
> & {servings: number};

export type CommunityRatingColumns = {
  community_rating_average: number | null;
  community_rating_count: number | null;
};

export const mapNutritionSummary = (
  row: Pick<
    NutritionColumns,
    'calories' | 'protein_g' | 'satiety_score' | 'nutrition_status'
  >,
): RecipeNutritionSummary => ({
  satietyScore: row.satiety_score ?? null,
  nutritionStatus: row.nutrition_status satisfies NutritionStatus | null,
  calories: row.calories ?? null,
  proteinG: row.protein_g ?? null,
});

export const mapNutritionInfoFromDetailRow = (
  row: NutritionColumns,
): NutritionInfo | null =>
  mapRowToNutritionInfo({
    version_id: '',
    recipe_id: '',
    servings: row.servings,
    title: '',
    calories: row.calories,
    protein_g: row.protein_g,
    carbs_g: row.carbs_g,
    fat_g: row.fat_g,
    fiber_g: row.fiber_g,
    sugar_g: row.sugar_g,
    sodium_mg: row.sodium_mg,
    prepared_weight_g: row.prepared_weight_g,
    satiety_score: row.satiety_score,
    nutrition_status: row.nutrition_status,
    nutrition_disclaimer: row.nutrition_disclaimer,
    nutrition_updated_at: row.nutrition_updated_at,
  });

export const mapCommunityRatingFromRow = (
  row: Partial<CommunityRatingColumns>,
): RecipeCommunityRating | null => {
  if (
    typeof row.community_rating_average !== 'number' ||
    typeof row.community_rating_count !== 'number' ||
    row.community_rating_count === 0
  ) {
    return null;
  }
  return {
    average: Math.round(row.community_rating_average * 10) / 10,
    count: row.community_rating_count,
    hasStaleRatings: false,
  };
};

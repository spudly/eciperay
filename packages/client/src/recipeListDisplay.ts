import type {
  PublicRecipeDiscoveryItem,
  RecipeCommunityRating,
  RecipeDetail,
  RecipeStarRating,
} from '@eciperay/types';

import {DISCOVER_NO_RATINGS_LABEL} from './discoverCopy.js';
import {formatCommunityRatingLabel} from './recipeEngagement.js';

type RatingSource = {
  starRating?: RecipeStarRating | null;
  communityRating?: RecipeCommunityRating | null;
};

/** Owner personal rating, else community average. */
export const getDisplayRating = (source: RatingSource): number | null => {
  if (typeof source.starRating === 'number') {
    return source.starRating;
  }
  return source.communityRating?.average ?? null;
};

export const formatDisplayRatingLabel = (source: RatingSource): string => {
  if (typeof source.starRating === 'number') {
    return `${source.starRating.toFixed(1)}★`;
  }
  if (source.communityRating) {
    return formatCommunityRatingLabel(
      source.communityRating.average,
      source.communityRating.count,
    );
  }
  return DISCOVER_NO_RATINGS_LABEL;
};

export const formatSatietyLabel = (
  satietyScore: number | null | undefined,
  nutritionStatus?: string | null,
): string => {
  if (typeof satietyScore === 'number') {
    return `Satiety ${satietyScore}`;
  }
  if (nutritionStatus === 'pending') {
    return 'Satiety…';
  }
  return 'Satiety —';
};

export const formatRecipeListMeta = (
  recipe: Pick<
    RecipeDetail,
    'starRating' | 'communityRating' | 'satietyScore' | 'nutritionStatus'
  >,
): string =>
  `${formatDisplayRatingLabel(recipe)} · ${formatSatietyLabel(recipe.satietyScore, recipe.nutritionStatus)}`;

export const formatDiscoveryListMeta = (
  recipe: Pick<
    PublicRecipeDiscoveryItem,
    'communityRating' | 'satietyScore' | 'nutritionStatus'
  >,
): string =>
  `${formatDisplayRatingLabel({communityRating: recipe.communityRating})} · ${formatSatietyLabel(recipe.satietyScore, recipe.nutritionStatus)}`;

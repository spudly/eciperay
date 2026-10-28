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
    // Spell the pending state out (#278): the previous 'Satiety…' read as
    // a truncated value on recipe cards — the ellipsis is the whole label
    // for a recipe whose nutrition has not been computed yet (e.g. a newly
    // created or renamed recipe), not a value cut off by the layout.
    return 'Satiety pending';
  }
  return 'Satiety —';
};

/** '1 serving' / 'N servings' — the one pluralization for servings counts. */
export const formatServingsLabel = (servings: number): string =>
  `${servings} ${servings === 1 ? 'serving' : 'servings'}`;

export const formatRecipeListMeta = (
  recipe: Pick<
    RecipeDetail,
    'starRating' | 'communityRating' | 'satietyScore' | 'nutritionStatus'
  >,
): string =>
  `${formatDisplayRatingLabel(recipe)} · ${formatSatietyLabel(recipe.satietyScore, recipe.nutritionStatus)}`;

/**
 * The recipe-card subtitle: servings · cook time · list meta. This is the
 * shared source the web and app list cards (and the app's shared-with-me host)
 * format with, so the servings pluralization (#278) and the satiety label
 * cannot drift between per-card copies again.
 */
export const formatRecipeListSubtitle = (
  recipe: Pick<
    RecipeDetail,
    | 'servings'
    | 'cookTimeMin'
    | 'starRating'
    | 'communityRating'
    | 'satietyScore'
    | 'nutritionStatus'
  >,
): string =>
  `${formatServingsLabel(recipe.servings)}${recipe.cookTimeMin ? ` · ${recipe.cookTimeMin} min` : ''} · ${formatRecipeListMeta(recipe)}`;

export const formatDiscoveryListMeta = (
  recipe: Pick<
    PublicRecipeDiscoveryItem,
    'communityRating' | 'satietyScore' | 'nutritionStatus'
  >,
): string =>
  `${formatDisplayRatingLabel({communityRating: recipe.communityRating})} · ${formatSatietyLabel(recipe.satietyScore, recipe.nutritionStatus)}`;

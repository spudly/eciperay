import type {
  PublicRecipeDiscoveryItem,
  RecipeCommunityRating,
  RecipeDetail,
  RecipeNutritionSummary,
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

/**
 * The condensed nutrition parts of a recipe summary (#361): calories, protein,
 * carbs, and fat, in that order, each shown only when its value is non-null —
 * the same rounding and wording as the meal totals line in
 * `formatSimpleNutrition`. Satiety is not part of this list: list surfaces
 * render it through `formatSatietyLabel`, which also covers the
 * pending/placeholder states.
 */
export const formatCondensedNutritionParts = (
  nutrition: Pick<
    RecipeNutritionSummary,
    'calories' | 'proteinG' | 'carbsG' | 'fatG'
  >,
): string[] => {
  const parts: string[] = [];
  if (typeof nutrition.calories === 'number') {
    parts.push(`${Math.round(nutrition.calories)} cal`);
  }
  if (typeof nutrition.proteinG === 'number') {
    parts.push(`${Math.round(nutrition.proteinG)}g protein`);
  }
  if (typeof nutrition.carbsG === 'number') {
    parts.push(`${Math.round(nutrition.carbsG)}g carbs`);
  }
  if (typeof nutrition.fatG === 'number') {
    parts.push(`${Math.round(nutrition.fatG)}g fat`);
  }
  return parts;
};

export const formatRecipeListMeta = (
  recipe: Pick<
    RecipeDetail,
    | 'starRating'
    | 'communityRating'
    | 'satietyScore'
    | 'nutritionStatus'
    | 'calories'
    | 'proteinG'
    | 'carbsG'
    | 'fatG'
  >,
): string =>
  [
    formatDisplayRatingLabel(recipe),
    ...formatCondensedNutritionParts(recipe),
    formatSatietyLabel(recipe.satietyScore, recipe.nutritionStatus),
  ].join(' · ');

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
    | 'calories'
    | 'proteinG'
    | 'carbsG'
    | 'fatG'
  >,
): string =>
  `${formatServingsLabel(recipe.servings)}${recipe.cookTimeMin ? ` · ${recipe.cookTimeMin} min` : ''} · ${formatRecipeListMeta(recipe)}`;

export const formatDiscoveryListMeta = (
  recipe: Pick<
    PublicRecipeDiscoveryItem,
    | 'communityRating'
    | 'satietyScore'
    | 'nutritionStatus'
    | 'calories'
    | 'proteinG'
    | 'carbsG'
    | 'fatG'
  >,
): string =>
  [
    formatDisplayRatingLabel({communityRating: recipe.communityRating}),
    ...formatCondensedNutritionParts(recipe),
    formatSatietyLabel(recipe.satietyScore, recipe.nutritionStatus),
  ].join(' · ');

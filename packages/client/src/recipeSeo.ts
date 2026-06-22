import type {
  Ingredient,
  PublicRecipeDetail,
  RecipeCommunityRating,
} from '@eciperay/types';

import {formatScaledIngredientLine} from './recipeScaling.js';

export const RECIPE_SEO_SITE_NAME = 'Eciperay';

export const buildRecipePageTitle = (title: string): string =>
  `${title} | ${RECIPE_SEO_SITE_NAME}`;

export const buildRecipeMetaDescription = (
  description: string | null,
  title: string,
): string => {
  const trimmed = description?.trim();
  let text = `View ${title} on ${RECIPE_SEO_SITE_NAME}.`;
  if (trimmed) {
    text = trimmed;
  }
  if (text.length <= 160) {
    return text;
  }
  return `${text.slice(0, 157)}...`;
};

export const formatSchemaDuration = (
  minutes: number | null,
): string | undefined => {
  if (minutes === null || minutes <= 0) {
    return undefined;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) {
    return `PT${mins}M`;
  }
  if (mins === 0) {
    return `PT${hours}H`;
  }
  return `PT${hours}H${mins}M`;
};

const formatIngredientForSchema = (ingredient: Ingredient): string =>
  formatScaledIngredientLine(
    {
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
    },
    1,
  );

const buildRecipeDescription = (recipe: PublicRecipeDetail): string => {
  const trimmed = recipe.description?.trim();
  if (trimmed) {
    return trimmed;
  }
  return `A recipe shared on ${RECIPE_SEO_SITE_NAME}.`;
};

const applyRecipeTimingFields = (
  jsonLd: Record<string, unknown>,
  recipe: PublicRecipeDetail,
): void => {
  const prepTime = formatSchemaDuration(recipe.prepTimeMin);
  if (prepTime) {
    jsonLd['prepTime'] = prepTime;
  }
  const cookTime = formatSchemaDuration(recipe.cookTimeMin);
  if (cookTime) {
    jsonLd['cookTime'] = cookTime;
  }
};

const applyCommunityRating = (
  jsonLd: Record<string, unknown>,
  communityRating?: RecipeCommunityRating | null,
): void => {
  if (communityRating && communityRating.count > 0) {
    jsonLd['aggregateRating'] = {
      '@type': 'AggregateRating',
      'ratingValue': communityRating.average,
      'ratingCount': communityRating.count,
    };
  }
};

export const buildRecipeJsonLd = (
  recipe: PublicRecipeDetail,
  canonicalUrl: string,
  communityRating?: RecipeCommunityRating | null,
): Record<string, unknown> => {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    'name': recipe.title,
    'description': buildRecipeDescription(recipe),
    'url': canonicalUrl,
    'recipeYield': `${recipe.servings} servings`,
    'recipeIngredient': recipe.ingredients.map(formatIngredientForSchema),
    'recipeInstructions': recipe.instructions.map(step => ({
      '@type': 'HowToStep',
      'text': step.body,
      'position': step.stepNumber,
    })),
  };

  if (recipe.imageUrl) {
    jsonLd['image'] = recipe.imageUrl;
  }

  applyRecipeTimingFields(jsonLd, recipe);
  applyCommunityRating(jsonLd, communityRating);

  return jsonLd;
};

export type RecipeSocialMeta = {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
};

export const buildRecipeSocialMeta = (
  recipe: PublicRecipeDetail,
  canonicalUrl: string,
): RecipeSocialMeta => ({
  title: buildRecipePageTitle(recipe.title),
  description: buildRecipeMetaDescription(recipe.description, recipe.title),
  url: canonicalUrl,
  ...(recipe.imageUrl ? {imageUrl: recipe.imageUrl} : {}),
});

export {type RecipeCommunityRating} from '@eciperay/types';

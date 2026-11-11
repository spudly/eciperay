import type {
  Ingredient,
  NutritionInfo,
  PublicRecipeDetail,
  PublicRecipeDiscoveryItem,
  RecipeCommunityRating,
} from '@eciperay/types';

import {formatScaledIngredientLine} from './recipeScaling.js';
import {buildRecipePermalink} from './recipeVisibility.js';

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
  // totalTime is only honest when both parts are known.
  if (
    prepTime &&
    cookTime &&
    recipe.prepTimeMin !== null &&
    recipe.cookTimeMin !== null
  ) {
    const totalTime = formatSchemaDuration(
      recipe.prepTimeMin + recipe.cookTimeMin,
    );
    if (totalTime) {
      jsonLd['totalTime'] = totalTime;
    }
  }
};

const applyAuthorField = (
  jsonLd: Record<string, unknown>,
  recipe: PublicRecipeDetail,
): void => {
  // The server only exposes authorDisplayName when the owner allows
  // their name on public recipes; never emit author otherwise.
  if (recipe.visibility !== 'public') {
    return;
  }
  const name = recipe.authorDisplayName?.trim();
  if (name) {
    jsonLd['author'] = {'@type': 'Person', 'name': name};
  }
};

/** Preset course tags (002_seed_preset_tags.sql) shown as tag pills. */
const RECIPE_CATEGORY_TAGS: ReadonlySet<string> = new Set([
  'appetizer',
  'breakfast',
  'brunch',
  'dessert',
  'dinner',
  'drink',
  'lunch',
  'side dish',
  'snack',
]);

/** Preset cuisine tags (002_seed_preset_tags.sql) shown as tag pills. */
const RECIPE_CUISINE_TAGS: ReadonlySet<string> = new Set([
  'american',
  'asian',
  'italian',
  'mediterranean',
  'mexican',
]);

const applyCategoryCuisineKeywords = (
  jsonLd: Record<string, unknown>,
  recipe: PublicRecipeDetail,
): void => {
  const tagNames = recipe.tags.map(tag => tag.name.trim()).filter(Boolean);
  const used = new Set<string>();
  const category = tagNames.find(name =>
    RECIPE_CATEGORY_TAGS.has(name.toLowerCase()),
  );
  if (category) {
    jsonLd['recipeCategory'] = category;
    used.add(category.toLowerCase());
  }
  const cuisine = tagNames.find(name =>
    RECIPE_CUISINE_TAGS.has(name.toLowerCase()),
  );
  if (cuisine) {
    jsonLd['recipeCuisine'] = cuisine;
    used.add(cuisine.toLowerCase());
  }
  // Google: keywords must not duplicate category/cuisine values.
  const keywords: string[] = [];
  for (const name of tagNames) {
    const key = name.toLowerCase();
    if (used.has(key) || keywords.some(k => k.toLowerCase() === key)) {
      continue;
    }
    keywords.push(name);
  }
  if (keywords.length > 0) {
    jsonLd['keywords'] = keywords.join(', ');
  }
};

const buildNutritionInformation = (
  nutrition: NutritionInfo,
): Record<string, unknown> => {
  const info: Record<string, unknown> = {
    '@type': 'NutritionInformation',
    'calories': `${nutrition.calories} calories`,
    'proteinContent': `${nutrition.proteinG} g`,
    'carbohydrateContent': `${nutrition.carbsG} g`,
    'fatContent': `${nutrition.fatG} g`,
  };
  if (nutrition.fiberG !== null) {
    info['fiberContent'] = `${nutrition.fiberG} g`;
  }
  if (nutrition.sugarG !== null) {
    info['sugarContent'] = `${nutrition.sugarG} g`;
  }
  if (nutrition.sodiumMg !== null) {
    info['sodiumContent'] = `${nutrition.sodiumMg} mg`;
  }
  return info;
};

const applyNutritionField = (
  jsonLd: Record<string, unknown>,
  recipe: PublicRecipeDetail,
): void => {
  if (recipe.nutrition && recipe.nutrition.status === 'ready') {
    jsonLd['nutrition'] = buildNutritionInformation(recipe.nutrition);
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

  // The recipe model carries exactly one image URL; emit what exists
  // and never fabricate aspect-ratio crops that were never generated.
  if (recipe.imageUrl) {
    jsonLd['image'] = recipe.imageUrl;
  }

  if (recipe.createdAt) {
    jsonLd['datePublished'] = recipe.createdAt;
  }

  applyRecipeTimingFields(jsonLd, recipe);
  applyAuthorField(jsonLd, recipe);
  applyCategoryCuisineKeywords(jsonLd, recipe);
  applyNutritionField(jsonLd, recipe);
  applyCommunityRating(jsonLd, communityRating);

  return jsonLd;
};

/**
 * ItemList of the public recipes listed on Discover, in display order — makes
 * the page eligible for the Recipe host carousel enhancement.
 */
export const buildDiscoverItemListJsonLd = (
  recipes: PublicRecipeDiscoveryItem[],
  baseUrl: string,
): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  'itemListElement': recipes
    .filter(recipe => recipe.visibility === 'public')
    .map((recipe, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'url': buildRecipePermalink(baseUrl, recipe),
      'name': recipe.title,
    })),
});

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

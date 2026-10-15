import type {PublicRecipeDetail} from '@eciperay/types';

import {
  buildRecipeJsonLd,
  buildRecipeMetaDescription,
  buildRecipePageTitle,
  buildRecipeSocialMeta,
  formatSchemaDuration,
  RECIPE_SEO_SITE_NAME,
} from './recipeSeo.js';
import {makeRecipeDetail} from './test/fixtures/recipe.js';

describe('recipeSeo', () => {
  const recipe: PublicRecipeDetail = (() => {
    const {userId: _userId, ...publicRecipe} = makeRecipeDetail({
      title: 'Public Pasta',
      description: 'A tasty pasta dish for everyone.',
      servings: 4,
      prepTimeMin: 10,
      cookTimeMin: 25,
      imageUrl: 'https://cdn.example/pasta.jpg',
      visibility: 'public',
    });
    return publicRecipe;
  })();

  test('builds page title and truncated description', () => {
    expect(buildRecipePageTitle('Public Pasta')).toBe(
      `Public Pasta | ${RECIPE_SEO_SITE_NAME}`,
    );
    expect(
      buildRecipeMetaDescription(recipe.description, recipe.title),
    ).toContain('tasty pasta');
    expect(buildRecipeMetaDescription(null, 'Salad')).toBe(
      `View Salad on ${RECIPE_SEO_SITE_NAME}.`,
    );
    const longDescription = 'x'.repeat(200);
    expect(buildRecipeMetaDescription(longDescription, 'Soup').length).toBe(
      160,
    );
  });

  test('formats schema durations', () => {
    expect(formatSchemaDuration(null)).toBeUndefined();
    expect(formatSchemaDuration(0)).toBeUndefined();
    expect(formatSchemaDuration(15)).toBe('PT15M');
    expect(formatSchemaDuration(60)).toBe('PT1H');
    expect(formatSchemaDuration(90)).toBe('PT1H30M');
  });

  test('builds recipe JSON-LD without ratings', () => {
    const jsonLd = buildRecipeJsonLd(
      recipe,
      'https://www.eciperay.com/recipe/r1/pasta',
    );
    expect(jsonLd).toMatchObject({
      '@type': 'Recipe',
      'name': 'Public Pasta',
      'url': 'https://www.eciperay.com/recipe/r1/pasta',
      'image': 'https://cdn.example/pasta.jpg',
      'prepTime': 'PT10M',
      'cookTime': 'PT25M',
      'recipeYield': '4 servings',
    });
    expect(jsonLd['aggregateRating']).toBeUndefined();
    expect(jsonLd['recipeIngredient']).toEqual(['2 cups Flour']);
    expect(jsonLd['recipeInstructions']).toEqual([
      {'@type': 'HowToStep', 'text': 'Mix dry ingredients', 'position': 1},
    ]);
  });

  test('includes aggregateRating when community ratings exist', () => {
    const jsonLd = buildRecipeJsonLd(
      recipe,
      'https://www.eciperay.com/recipe/r1/pasta',
      {average: 4.5, count: 12, hasStaleRatings: false},
    );
    expect(jsonLd['aggregateRating']).toEqual({
      '@type': 'AggregateRating',
      'ratingValue': 4.5,
      'ratingCount': 12,
    });
  });

  test('builds social meta with optional image', () => {
    const social = buildRecipeSocialMeta(
      recipe,
      'https://www.eciperay.com/recipe/r1/pasta',
    );
    expect(social.title).toBe(`Public Pasta | ${RECIPE_SEO_SITE_NAME}`);
    expect(social.imageUrl).toBe('https://cdn.example/pasta.jpg');
  });

  test('omits image from social meta when recipe has no image', () => {
    const social = buildRecipeSocialMeta(
      {...recipe, imageUrl: null},
      'https://www.eciperay.com/recipe/r1/pasta',
    );
    expect(social.imageUrl).toBeUndefined();
  });

  test('uses fallback JSON-LD description when recipe description is blank', () => {
    const jsonLd = buildRecipeJsonLd(
      {...recipe, description: '   '},
      'https://www.eciperay.com/recipe/r1/pasta',
    );
    expect(jsonLd['description']).toBe(
      `A recipe shared on ${RECIPE_SEO_SITE_NAME}.`,
    );
  });
});

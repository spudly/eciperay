import type {PublicRecipeDetail} from '@eciperay/types';

import {
  buildDiscoverItemListJsonLd,
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
    return {...publicRecipe, authorDisplayName: 'Chef Alex'};
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

  test('includes totalTime as the sum of prep and cook times', () => {
    const jsonLd = buildRecipeJsonLd(
      recipe,
      'https://www.eciperay.com/recipe/r1/pasta',
    );
    expect(jsonLd['totalTime']).toBe('PT35M');
  });

  test('omits totalTime when either prep or cook time is unknown', () => {
    const noPrep = buildRecipeJsonLd(
      {...recipe, prepTimeMin: null},
      'https://www.eciperay.com/recipe/r1/pasta',
    );
    expect(noPrep['totalTime']).toBeUndefined();
    const noCook = buildRecipeJsonLd(
      {...recipe, cookTimeMin: null},
      'https://www.eciperay.com/recipe/r1/pasta',
    );
    expect(noCook['totalTime']).toBeUndefined();
  });

  test('includes author and datePublished for public recipes', () => {
    const jsonLd = buildRecipeJsonLd(
      recipe,
      'https://www.eciperay.com/recipe/r1/pasta',
    );
    expect(jsonLd['author']).toEqual({'@type': 'Person', 'name': 'Chef Alex'});
    expect(jsonLd['datePublished']).toBe(recipe.createdAt);
  });

  test('omits author when the owner hides their name or recipe is not public', () => {
    const hidden = buildRecipeJsonLd(
      {...recipe, authorDisplayName: null},
      'https://www.eciperay.com/recipe/r1/pasta',
    );
    expect(hidden['author']).toBeUndefined();
    const blank = buildRecipeJsonLd(
      {...recipe, authorDisplayName: '   '},
      'https://www.eciperay.com/recipe/r1/pasta',
    );
    expect(blank['author']).toBeUndefined();
    const unlisted = buildRecipeJsonLd(
      {...recipe, visibility: 'unlisted'},
      'https://www.eciperay.com/recipe/r1/pasta',
    );
    expect(unlisted['author']).toBeUndefined();
  });

  test('maps displayed course and cuisine tags to category and cuisine', () => {
    const jsonLd = buildRecipeJsonLd(
      {
        ...recipe,
        tags: [
          {
            id: 't1',
            userId: null,
            name: 'Dinner',
            color: '#000',
            isPreset: true,
          },
          {
            id: 't2',
            userId: null,
            name: 'Italian',
            color: '#000',
            isPreset: true,
          },
          {
            id: 't3',
            userId: null,
            name: 'Vegetarian',
            color: '#000',
            isPreset: true,
          },
        ],
      },
      'https://www.eciperay.com/recipe/r1/pasta',
    );
    expect(jsonLd['recipeCategory']).toBe('Dinner');
    expect(jsonLd['recipeCuisine']).toBe('Italian');
    // Keywords carry the remaining tags, de-duplicated against
    // category/cuisine per Google's guideline.
    expect(jsonLd['keywords']).toBe('Vegetarian');
  });

  test('de-duplicates keywords against category and cuisine case-insensitively', () => {
    const jsonLd = buildRecipeJsonLd(
      {
        ...recipe,
        tags: [
          {
            id: 't1',
            userId: null,
            name: 'dinner',
            color: '#000',
            isPreset: true,
          },
          {
            id: 't2',
            userId: null,
            name: 'Dinner',
            color: '#000',
            isPreset: true,
          },
          {
            id: 't3',
            userId: null,
            name: 'Quick',
            color: '#000',
            isPreset: true,
          },
          {
            id: 't4',
            userId: null,
            name: 'quick',
            color: '#000',
            isPreset: true,
          },
        ],
      },
      'https://www.eciperay.com/recipe/r1/pasta',
    );
    expect(jsonLd['recipeCategory']).toBe('dinner');
    expect(jsonLd['recipeCuisine']).toBeUndefined();
    expect(jsonLd['keywords']).toBe('Quick');
  });

  test('omits category, cuisine, and keywords when the recipe has no tags', () => {
    const jsonLd = buildRecipeJsonLd(
      {...recipe, tags: []},
      'https://www.eciperay.com/recipe/r1/pasta',
    );
    expect(jsonLd['recipeCategory']).toBeUndefined();
    expect(jsonLd['recipeCuisine']).toBeUndefined();
    expect(jsonLd['keywords']).toBeUndefined();
  });

  test('includes per-serving nutrition when nutrition is ready', () => {
    const jsonLd = buildRecipeJsonLd(
      {
        ...recipe,
        nutrition: {
          servings: 4,
          calories: 520,
          proteinG: 24,
          carbsG: 60,
          fatG: 18,
          fiberG: 6,
          sugarG: null,
          sodiumMg: 480,
          preparedWeightG: 900,
          disclaimer: '',
          satietyScore: 70,
          status: 'ready',
        },
      },
      'https://www.eciperay.com/recipe/r1/pasta',
    );
    expect(jsonLd['nutrition']).toEqual({
      '@type': 'NutritionInformation',
      'calories': '520 calories',
      'proteinContent': '24 g',
      'carbohydrateContent': '60 g',
      'fatContent': '18 g',
      'fiberContent': '6 g',
      'sodiumContent': '480 mg',
    });
  });

  test('omits nutrition when it is missing or not ready', () => {
    const missing = buildRecipeJsonLd(
      recipe,
      'https://www.eciperay.com/recipe/r1/pasta',
    );
    expect(missing['nutrition']).toBeUndefined();
    const pending = buildRecipeJsonLd(
      {
        ...recipe,
        nutrition: {
          servings: 4,
          calories: 520,
          proteinG: 24,
          carbsG: 60,
          fatG: 18,
          fiberG: null,
          sugarG: null,
          sodiumMg: null,
          preparedWeightG: 900,
          disclaimer: '',
          satietyScore: 70,
          status: 'pending',
        },
      },
      'https://www.eciperay.com/recipe/r1/pasta',
    );
    expect(pending['nutrition']).toBeUndefined();
  });

  test('builds a Discover ItemList of public recipes in display order', () => {
    const itemList = buildDiscoverItemListJsonLd(
      [
        {
          id: 'r1',
          slug: 'pasta',
          title: 'Pasta',
          description: null,
          servings: 4,
          prepTimeMin: null,
          cookTimeMin: null,
          imageUrl: null,
          visibility: 'public',
          authorDisplayName: 'Chef Alex',
          updatedAt: '2024-01-01T00:00:00.000Z',
          tags: [],
          communityRating: null,
          satietyScore: null,
          nutritionStatus: null,
          calories: null,
          proteinG: null,
          carbsG: null,
          fatG: null,
        },
        {
          id: 'r2',
          slug: 'salad',
          title: 'Salad',
          description: null,
          servings: 2,
          prepTimeMin: null,
          cookTimeMin: null,
          imageUrl: null,
          visibility: 'public',
          authorDisplayName: null,
          updatedAt: '2024-01-02T00:00:00.000Z',
          tags: [],
          communityRating: null,
          satietyScore: null,
          nutritionStatus: null,
          calories: null,
          proteinG: null,
          carbsG: null,
          fatG: null,
        },
      ],
      'https://www.eciperay.com',
    );
    expect(itemList).toEqual({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      'itemListElement': [
        {
          '@type': 'ListItem',
          'position': 1,
          'url': 'https://www.eciperay.com/recipe/r1/pasta',
          'name': 'Pasta',
        },
        {
          '@type': 'ListItem',
          'position': 2,
          'url': 'https://www.eciperay.com/recipe/r2/salad',
          'name': 'Salad',
        },
      ],
    });
  });

  test('builds an empty ItemList when there are no listed recipes', () => {
    const itemList = buildDiscoverItemListJsonLd(
      [],
      'https://www.eciperay.com',
    );
    expect(itemList['itemListElement']).toEqual([]);
  });
});

import type {RecipeVersionInput} from '@eciperay/types';

import {
  parseProposedRecipe,
  sortedPreviewIngredients,
  sortedPreviewInstructions,
} from './recipeInputPreview.js';

describe('parseProposedRecipe', () => {
  const recipe: RecipeVersionInput = {
    title: 'Pasta',
    description: 'Creamy pasta',
    servings: 4,
    prepTimeMin: 10,
    cookTimeMin: 20,
    imageUrl: null,
    sourceUrl: null,
    ingredients: [
      {
        sortOrder: 0,
        name: 'pasta',
        quantity: 400,
        unit: 'g',
        notes: null,
        isOptional: false,
      },
    ],
    instructions: [{stepNumber: 1, body: 'Cook'}],
    tagIds: ['tag-1'],
  };

  test('returns null for missing or invalid values', () => {
    expect(parseProposedRecipe(null)).toBeNull();
    expect(parseProposedRecipe()).toBeNull();
    expect(parseProposedRecipe({})).toBeNull();
    expect(
      parseProposedRecipe({title: 1, ingredients: [], instructions: []}),
    ).toBeNull();
    expect(
      parseProposedRecipe({
        title: 'Pasta',
        ingredients: 'nope',
        instructions: [],
      }),
    ).toBeNull();
    expect(
      parseProposedRecipe({
        title: 'Pasta',
        ingredients: [],
        instructions: 'nope',
      }),
    ).toBeNull();
  });

  test('parses a valid proposed recipe', () => {
    expect(
      parseProposedRecipe(recipe as unknown as Record<string, unknown>),
    ).toEqual(recipe);
  });

  test('fills defaults for optional fields', () => {
    expect(
      parseProposedRecipe({title: 'Soup', ingredients: [], instructions: []}),
    ).toEqual({
      title: 'Soup',
      description: null,
      servings: 1,
      prepTimeMin: null,
      cookTimeMin: null,
      imageUrl: null,
      sourceUrl: null,
      ingredients: [],
      instructions: [],
      tagIds: [],
    });
  });
});

describe('sortedPreviewIngredients', () => {
  test('sorts ingredients by sortOrder', () => {
    const input: RecipeVersionInput = {
      title: 'Pasta',
      description: null,
      servings: 1,
      prepTimeMin: null,
      cookTimeMin: null,
      imageUrl: null,
      sourceUrl: null,
      ingredients: [
        {
          sortOrder: 2,
          name: 'b',
          quantity: null,
          unit: null,
          notes: null,
          isOptional: false,
        },
        {
          sortOrder: 0,
          name: 'a',
          quantity: null,
          unit: null,
          notes: null,
          isOptional: false,
        },
      ],
      instructions: [],
      tagIds: [],
    };
    expect(
      sortedPreviewIngredients(input).map(ingredient => ingredient.name),
    ).toEqual(['a', 'b']);
  });
});

describe('sortedPreviewInstructions', () => {
  test('sorts instructions by stepNumber', () => {
    const input: RecipeVersionInput = {
      title: 'Pasta',
      description: null,
      servings: 1,
      prepTimeMin: null,
      cookTimeMin: null,
      imageUrl: null,
      sourceUrl: null,
      ingredients: [],
      instructions: [
        {stepNumber: 2, body: 'Serve'},
        {stepNumber: 1, body: 'Cook'},
      ],
      tagIds: [],
    };
    expect(sortedPreviewInstructions(input).map(step => step.body)).toEqual([
      'Cook',
      'Serve',
    ]);
  });
});

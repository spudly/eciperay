import type {RecipeImport} from '@recipoo/types';

import {RecipeImportError, recipeImportToInput} from './recipeImportToInput.js';

const baseImport: RecipeImport = {
  title: 'Soup',
  description: null,
  servings: 4,
  prepTimeMin: 10,
  cookTimeMin: 20,
  sourceUrl: null,
  ingredients: [
    {
      sortOrder: 5,
      name: 'broth',
      quantity: 1,
      unit: 'L',
      notes: null,
      isOptional: false,
    },
  ],
  instructions: [{stepNumber: 9, body: 'Simmer'}],
};

describe('recipeImportToInput', () => {
  test('sorts ingredients by sortOrder before renumbering', () => {
    const input = recipeImportToInput({
      ...baseImport,
      ingredients: [
        {
          sortOrder: 2,
          name: 'salt',
          quantity: 1,
          unit: 'tsp',
          notes: null,
          isOptional: false,
        },
        {
          sortOrder: 0,
          name: 'flour',
          quantity: 2,
          unit: 'cups',
          notes: null,
          isOptional: false,
        },
        {
          sortOrder: 1,
          name: 'sugar',
          quantity: 1,
          unit: 'cup',
          notes: null,
          isOptional: false,
        },
      ],
    });
    expect(input.ingredients.map(ing => ing.name)).toEqual([
      'flour',
      'sugar',
      'salt',
    ]);
    expect(input.ingredients.map(ing => ing.sortOrder)).toEqual([0, 1, 2]);
  });

  test('sorts instructions by stepNumber before renumbering', () => {
    const input = recipeImportToInput({
      ...baseImport,
      instructions: [
        {stepNumber: 3, body: 'Serve'},
        {stepNumber: 1, body: 'Prep'},
        {stepNumber: 2, body: 'Cook'},
      ],
    });
    expect(input.instructions.map(ins => ins.body)).toEqual([
      'Prep',
      'Cook',
      'Serve',
    ]);
    expect(input.instructions.map(ins => ins.stepNumber)).toEqual([1, 2, 3]);
  });

  test('converts import to input with empty tagIds and normalized ordering', () => {
    const input = recipeImportToInput(baseImport, {
      sourceUrl: 'https://example.com/soup',
    });
    expect(input.tagIds).toEqual([]);
    expect(input.sourceUrl).toBe('https://example.com/soup');
    expect(input.ingredients[0]?.sortOrder).toBe(0);
    expect(input.instructions[0]?.stepNumber).toBe(1);
  });

  test('uses provided tagIds', () => {
    const input = recipeImportToInput(baseImport, {tagIds: ['tag-1', 'tag-2']});
    expect(input.tagIds).toEqual(['tag-1', 'tag-2']);
  });

  test('uses provided imageUrl', () => {
    const input = recipeImportToInput(baseImport, {
      imageUrl: 'https://example.com/photo.jpg',
    });
    expect(input.imageUrl).toBe('https://example.com/photo.jpg');
  });

  test('prefers import sourceUrl over option', () => {
    const input = recipeImportToInput(
      {...baseImport, sourceUrl: 'https://import.example.com'},
      {sourceUrl: 'https://fallback.example.com'},
    );
    expect(input.sourceUrl).toBe('https://import.example.com');
  });

  test('throws when servings is null', () => {
    expect(() => recipeImportToInput({...baseImport, servings: null})).toThrow(
      RecipeImportError,
    );
  });
});

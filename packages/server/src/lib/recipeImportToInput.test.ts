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
  test('converts import to input with empty tagIds and normalized ordering', () => {
    const input = recipeImportToInput(baseImport, {
      sourceUrl: 'https://example.com/soup',
    });
    expect(input.tagIds).toEqual([]);
    expect(input.sourceUrl).toBe('https://example.com/soup');
    expect(input.ingredients[0]?.sortOrder).toBe(0);
    expect(input.instructions[0]?.stepNumber).toBe(1);
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

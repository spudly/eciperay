import type {IngredientInput} from '@eciperay/types';

import {makeRecipeInput} from '../test/fixtures/recipe.js';
import {makeIngredient} from '../test/fixtures/ingredient.js';
import {makeInstruction} from '../test/fixtures/instruction.js';

import {recipeContentUnchanged} from './recipeContentEquals.js';

describe('recipeContentUnchanged', () => {
  test('detects ingredient and instruction changes', () => {
    const version = {
      ingredients: [makeIngredient()],
      instructions: [makeInstruction()],
    };
    expect(recipeContentUnchanged(version, makeRecipeInput())).toBe(true);
    expect(
      recipeContentUnchanged(version, {
        ...makeRecipeInput(),
        ingredients: [
          {
            sortOrder: 0,
            name: 'Sugar',
            quantity: 1,
            unit: 'cup',
            notes: null,
            isOptional: false,
          },
        ],
      }),
    ).toBe(false);
  });

  test('treats nullish ingredient fields as equivalent', () => {
    const version = {
      ingredients: [
        {...makeIngredient(), quantity: null, notes: null, isOptional: false},
      ],
      instructions: [makeInstruction()],
    };
    expect(
      recipeContentUnchanged(version, {
        ...makeRecipeInput(),
        ingredients: [
          {
            sortOrder: 0,
            name: 'Flour',
            quantity: undefined,
            unit: 'cups',
            notes: undefined,
            isOptional: false,
          },
        ] as unknown as IngredientInput[],
      }),
    ).toBe(true);
  });

  test('treats null and undefined unit as equivalent', () => {
    const version = {
      ingredients: [{...makeIngredient(), unit: null}],
      instructions: [makeInstruction()],
    };
    expect(
      recipeContentUnchanged(version, {
        ...makeRecipeInput(),
        ingredients: [
          {
            sortOrder: 0,
            name: 'Flour',
            quantity: 2,
            unit: undefined,
            notes: null,
            isOptional: false,
          },
        ] as unknown as IngredientInput[],
      }),
    ).toBe(true);
  });
});

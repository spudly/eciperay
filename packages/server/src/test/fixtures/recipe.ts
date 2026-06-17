import type {Recipe, RecipeDetail, RecipeInput} from '@eciperay/types';

import {makeIngredient, makeIngredientInput} from './ingredient.js';
import {makeInstruction, makeInstructionInput} from './instruction.js';
import {makeTag} from './tag.js';

export const makeRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: 'recipe-uuid-1',
  userId: 'user-uuid-1',
  title: 'Test Recipe',
  description: 'A test recipe',
  servings: 4,
  prepTimeMin: 15,
  cookTimeMin: 30,
  imageUrl: null,
  starRating: null,
  sourceUrl: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

export const makeRecipeDetail = (
  overrides: Partial<RecipeDetail> = {},
): RecipeDetail => ({
  ...makeRecipe(),
  ingredients: [makeIngredient()],
  instructions: [makeInstruction()],
  tags: [makeTag()],
  ...overrides,
});

export const makeRecipeInput = (
  overrides: Partial<RecipeInput> = {},
): RecipeInput => ({
  title: 'Test Recipe',
  description: 'A test recipe',
  servings: 4,
  prepTimeMin: 15,
  cookTimeMin: 30,
  imageUrl: null,
  starRating: null,
  sourceUrl: null,
  ingredients: [makeIngredientInput()],
  instructions: [makeInstructionInput()],
  tagIds: [],
  ...overrides,
});

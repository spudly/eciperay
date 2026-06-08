import type {Ingredient, IngredientInput} from '@recipoo/types';

export const makeIngredient = (
  overrides: Partial<Ingredient> = {},
): Ingredient => ({
  id: 'ingredient-uuid-1',
  recipeId: 'recipe-uuid-1',
  sortOrder: 0,
  name: 'Flour',
  quantity: 2,
  unit: 'cups',
  notes: null,
  isOptional: false,
  ...overrides,
});

export const makeIngredientInput = (
  overrides: Partial<IngredientInput> = {},
): IngredientInput => ({
  sortOrder: 0,
  name: 'Flour',
  quantity: 2,
  unit: 'cups',
  notes: null,
  isOptional: false,
  ...overrides,
});

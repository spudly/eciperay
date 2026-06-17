import type {
  IngredientInput,
  InstructionInput,
  RecipeInput,
} from '@eciperay/types';

import {createFormRowKey} from './createFormRowKey.js';

export type FormIngredientRow = IngredientInput & {key: string};
export type FormInstructionRow = InstructionInput & {key: string};

type IngredientWithOptionalKey = IngredientInput & {key?: string};
type InstructionWithOptionalKey = InstructionInput & {key?: string};

export type RecipeFormInitial = Omit<
  RecipeInput,
  'ingredients' | 'instructions'
> & {
  ingredients: IngredientWithOptionalKey[];
  instructions: InstructionWithOptionalKey[];
};

export const ensureIngredientRowKeys = (
  ingredients: IngredientWithOptionalKey[],
): FormIngredientRow[] =>
  ingredients.map(ingredient => ({
    ...ingredient,
    key: ingredient.key ?? createFormRowKey(),
  }));

export const ensureInstructionRowKeys = (
  instructions: InstructionWithOptionalKey[],
): FormInstructionRow[] =>
  instructions.map(instruction => ({
    ...instruction,
    key: instruction.key ?? createFormRowKey(),
  }));

const stripRowKey = <T extends {key: string}>(row: T): Omit<T, 'key'> => {
  const {key, ...rest} = row;
  void key;
  return rest;
};

export const toRecipeInputIngredients = (
  ingredients: FormIngredientRow[],
): IngredientInput[] =>
  ingredients.map((ingredient, index) => ({
    ...stripRowKey(ingredient),
    sortOrder: index,
  }));

export const toRecipeInputInstructions = (
  instructions: FormInstructionRow[],
): InstructionInput[] =>
  instructions.map((instruction, index) => ({
    ...stripRowKey(instruction),
    stepNumber: index + 1,
  }));

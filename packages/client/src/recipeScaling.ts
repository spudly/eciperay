import type {Ingredient} from '@eciperay/types';

import {scaleQuantity} from './scaleQuantity.js';

export const RECIPE_SCALE_MULTIPLIERS = [0.5, 1, 2, 3] as const;

export type RecipeScaleMultiplier = (typeof RECIPE_SCALE_MULTIPLIERS)[number];

export const servingsForMultiplier = (
  baseServings: number,
  multiplier: RecipeScaleMultiplier,
): number => Math.max(1, Math.round(baseServings * multiplier));

export const scaleFactorFromServings = (
  baseServings: number,
  servings: number,
): number => servings / baseServings;

export const resolveRecipeServings = (
  override: string | number | null | undefined,
  baseServings: number,
): number => {
  const parsed =
    typeof override === 'string'
      ? Number(override)
      : typeof override === 'number'
        ? override
        : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 1) {
    return baseServings;
  }
  return Math.round(parsed);
};

export const formatScaleMultiplierLabel = (
  multiplier: RecipeScaleMultiplier,
): string => (multiplier === 0.5 ? '½×' : `${multiplier}×`);

export const isActiveScaleMultiplier = (
  baseServings: number,
  servings: number,
  multiplier: RecipeScaleMultiplier,
): boolean => {
  if (servings !== servingsForMultiplier(baseServings, multiplier)) {
    return false;
  }
  if (servings === baseServings && multiplier !== 1) {
    return false;
  }
  return true;
};

export const sortIngredientsByOrder = <T extends {sortOrder: number}>(
  ingredients: T[],
): T[] => [...ingredients].sort((a, b) => a.sortOrder - b.sortOrder);

export const formatScaledIngredientLine = (
  ingredient: Pick<Ingredient, 'quantity' | 'unit' | 'name'>,
  scaleFactor: number,
): string => {
  const scaled = scaleQuantity(
    ingredient.quantity,
    ingredient.unit,
    scaleFactor,
  );
  return scaled ? `${scaled} ${ingredient.name}` : ingredient.name;
};

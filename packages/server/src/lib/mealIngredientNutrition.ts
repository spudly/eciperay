import type {MealIngredientInput, NutritionStatus} from '@eciperay/types';

import {estimateNutritionFromAi} from './refreshRecipeNutrition.js';
import {calculateSatiety} from './satiety.js';

/**
 * Stored nutrition for one direct meal ingredient (#362), in the recipe
 * nutrition shape: macros are per serving, `preparedWeightG` is the whole
 * entry's weight (all of the entry's servings combined).
 */
export type MealIngredientNutrition = {
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
  preparedWeightG: number | null;
  satietyScore: number | null;
  nutritionStatus: NutritionStatus;
  nutritionDisclaimer: string | null;
};

const failedNutrition: MealIngredientNutrition = {
  calories: null,
  proteinG: null,
  carbsG: null,
  fatG: null,
  fiberG: null,
  sugarG: null,
  sodiumMg: null,
  preparedWeightG: null,
  satietyScore: null,
  nutritionStatus: 'failed',
  nutritionDisclaimer: null,
};

/**
 * Estimate a direct ingredient's nutrition with the same lookup full recipes
 * use (#362, Stephen's approval): `estimateNutritionFromAi` over the entry's
 * name/quantity/unit, at the entry's own servings. There are no user-entered
 * nutrition values.
 *
 * A failed estimate does not fail the meal save — mirroring recipe nutrition,
 * the entry is stored with status 'failed' and null macros, so aggregation
 * treats it as non-contributing (meal totals go 'partial'/'unavailable')
 * instead of inventing numbers.
 */
export const estimateMealIngredientNutrition = async (
  ingredient: MealIngredientInput & {servings: number},
): Promise<MealIngredientNutrition> => {
  try {
    const estimated = await estimateNutritionFromAi(
      [
        {
          name: ingredient.name,
          quantity: ingredient.quantity ?? null,
          unit: ingredient.unit ?? null,
        },
      ],
      ingredient.servings,
    );
    // Satiety is computed over the whole entry, exactly as
    // refreshRecipeNutrition computes it over the whole recipe:
    // per-serving macros scaled back up by the entry's servings, with
    // the whole-entry prepared weight.
    const satiety = calculateSatiety({
      calories: estimated.calories * ingredient.servings,
      protein: estimated.proteinG * ingredient.servings,
      fat: estimated.fatG * ingredient.servings,
      totalCarbs: estimated.carbsG * ingredient.servings,
      fiber: (estimated.fiberG ?? 0) * ingredient.servings,
      sugar: (estimated.sugarG ?? 0) * ingredient.servings,
      sodium: (estimated.sodiumMg ?? 0) * ingredient.servings,
      weight: estimated.preparedWeightG,
    });
    return {
      calories: estimated.calories,
      proteinG: estimated.proteinG,
      carbsG: estimated.carbsG,
      fatG: estimated.fatG,
      fiberG: estimated.fiberG,
      sugarG: estimated.sugarG,
      sodiumMg: estimated.sodiumMg,
      preparedWeightG: estimated.preparedWeightG,
      satietyScore: satiety.score,
      nutritionStatus: 'ready',
      nutritionDisclaimer: estimated.disclaimer,
    };
  } catch {
    return failedNutrition;
  }
};

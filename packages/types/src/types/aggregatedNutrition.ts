import type {NutritionStatus} from './nutrition.js';

/** Aggregated macros for a meal or meal plan (whole unit, not per-serving). */
export type AggregatedNutritionStatus =
  | 'ready'
  | 'partial'
  | 'unavailable'
  | NutritionStatus;

export type AggregatedNutrition = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  preparedWeightG: number;
  satietyScore: number | null;
  status: AggregatedNutritionStatus;
};

export type MealPlanNutrition = AggregatedNutrition & {
  /** Present when the plan has a date range with dayCount >= 1. */
  perDay: AggregatedNutrition | null;
};

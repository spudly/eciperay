import type {NutritionStatus} from './nutrition.js';

/** Aggregated macros for a meal or meal plan (whole unit, not per-serving). */
export type AggregatedNutritionStatus =
  'ready' | 'partial' | 'unavailable' | NutritionStatus;

export type AggregatedNutrition = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Null when any contributing recipe's fiber is unknown — an aggregate
   * must not present a partial fiber total as complete (#613 review). */
  fiberG: number | null;
  sugarG: number;
  sodiumMg: number;
  preparedWeightG: number;
  satietyScore: number | null;
  status: AggregatedNutritionStatus;
};

export type MealPlanNutrition = AggregatedNutrition & {
  /**
   * Per-day average of the (eaten) totals. Present when the plan has a date
   * range with dayCount >= 1: plan entries carry no day assignment, so the
   * plan's date-range day count is the denominator (see loadMealPlanDetail —
   * #363's days-with-entries denominator cannot be derived from entries that
   * have no day field).
   */
  perDay: AggregatedNutrition | null;
};

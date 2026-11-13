import type {
  AggregatedNutrition,
  MealPlanNutrition,
  NutritionGoalBand,
  NutritionGoalFieldProgress,
  NutritionGoalProgress,
  NutritionGoals,
} from '@eciperay/types';

export const hasAnyNutritionGoal = (goals: NutritionGoals): boolean =>
  goals.caloriesMin !== null ||
  goals.caloriesMax !== null ||
  goals.proteinGMin !== null ||
  goals.proteinGMax !== null ||
  goals.carbsGMin !== null ||
  goals.carbsGMax !== null ||
  goals.fatGMin !== null ||
  goals.fatGMax !== null ||
  goals.satietyScoreMin !== null ||
  goals.satietyScoreMax !== null;

// One unified band rule for every field, satiety included (#521): the
// user-set range replaces the old implicit semantics (macros ±10% of a
// single target, satiety as a floor). An unset side never bands.
const rangeBand = (
  actual: number,
  min: number | null,
  max: number | null,
): NutritionGoalBand => {
  if (min !== null && actual < min) {
    return 'under';
  }
  if (max !== null && actual > max) {
    return 'over';
  }
  return 'onTrack';
};

const fieldProgress = (
  actual: number | null | undefined,
  min: number | null,
  max: number | null,
): NutritionGoalFieldProgress | null => {
  if (
    (min === null && max === null) ||
    actual === null ||
    actual === undefined
  ) {
    return null;
  }
  const band = rangeBand(actual, min, max);
  return {
    min,
    max,
    actual,
    delta:
      band === 'under' && min !== null
        ? actual - min
        : band === 'over' && max !== null
          ? actual - max
          : 0,
    band,
  };
};

export const dailyActualFromPlanNutrition = (
  nutrition: MealPlanNutrition | AggregatedNutrition | null,
): AggregatedNutrition | null => {
  if (!nutrition) {
    return null;
  }
  if ('perDay' in nutrition && nutrition.perDay) {
    return nutrition.perDay;
  }
  return nutrition;
};

export const comparePlanToGoals = (
  nutrition: MealPlanNutrition | AggregatedNutrition | null,
  goals: NutritionGoals,
): NutritionGoalProgress | null => {
  if (!hasAnyNutritionGoal(goals)) {
    return null;
  }
  const actual = dailyActualFromPlanNutrition(nutrition);
  if (!actual || actual.status === 'unavailable') {
    return null;
  }

  return {
    calories: fieldProgress(
      actual.calories,
      goals.caloriesMin,
      goals.caloriesMax,
    ),
    proteinG: fieldProgress(
      actual.proteinG,
      goals.proteinGMin,
      goals.proteinGMax,
    ),
    carbsG: fieldProgress(actual.carbsG, goals.carbsGMin, goals.carbsGMax),
    fatG: fieldProgress(actual.fatG, goals.fatGMin, goals.fatGMax),
    satietyScore: fieldProgress(
      actual.satietyScore,
      goals.satietyScoreMin,
      goals.satietyScoreMax,
    ),
  };
};

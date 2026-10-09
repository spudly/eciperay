import type {
  AggregatedNutrition,
  MealPlanNutrition,
  NutritionGoalBand,
  NutritionGoalFieldProgress,
  NutritionGoalProgress,
  NutritionGoals,
} from '@eciperay/types';

const ON_TRACK_TOLERANCE = 0.1;

export const hasAnyNutritionGoal = (goals: NutritionGoals): boolean =>
  goals.calories !== null ||
  goals.proteinG !== null ||
  goals.carbsG !== null ||
  goals.fatG !== null ||
  goals.satietyScore !== null;

const macroBand = (actual: number, goal: number): NutritionGoalBand => {
  const low = goal * (1 - ON_TRACK_TOLERANCE);
  const high = goal * (1 + ON_TRACK_TOLERANCE);
  if (actual < low) {
    return 'under';
  }
  if (actual > high) {
    return 'over';
  }
  return 'onTrack';
};

const satietyBand = (actual: number, goal: number): NutritionGoalBand =>
  actual >= goal ? 'onTrack' : 'under';

const fieldProgress = (
  actual: number | null | undefined,
  goal: number | null,
  kind: 'macro' | 'satiety',
): NutritionGoalFieldProgress | null => {
  if (goal === null || actual === null || actual === undefined) {
    return null;
  }
  const percentOfGoal = goal === 0 ? null : (actual / goal) * 100;
  return {
    goal,
    actual,
    delta: actual - goal,
    percentOfGoal,
    band:
      kind === 'satiety' ? satietyBand(actual, goal) : macroBand(actual, goal),
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
    calories: fieldProgress(actual.calories, goals.calories, 'macro'),
    proteinG: fieldProgress(actual.proteinG, goals.proteinG, 'macro'),
    carbsG: fieldProgress(actual.carbsG, goals.carbsG, 'macro'),
    fatG: fieldProgress(actual.fatG, goals.fatG, 'macro'),
    satietyScore: fieldProgress(
      actual.satietyScore,
      goals.satietyScore,
      'satiety',
    ),
  };
};

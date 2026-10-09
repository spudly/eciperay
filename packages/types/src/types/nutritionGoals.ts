export type NutritionGoals = {
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  satietyScore: number | null;
};

export type NutritionGoalBand = 'under' | 'onTrack' | 'over';

export type NutritionGoalFieldProgress = {
  goal: number;
  actual: number;
  delta: number;
  percentOfGoal: number | null;
  band: NutritionGoalBand;
};

export type NutritionGoalProgress = {
  calories: NutritionGoalFieldProgress | null;
  proteinG: NutritionGoalFieldProgress | null;
  carbsG: NutritionGoalFieldProgress | null;
  fatG: NutritionGoalFieldProgress | null;
  satietyScore: NutritionGoalFieldProgress | null;
};

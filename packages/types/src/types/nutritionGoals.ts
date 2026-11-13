export type NutritionGoals = {
  caloriesMin: number | null;
  caloriesMax: number | null;
  proteinGMin: number | null;
  proteinGMax: number | null;
  carbsGMin: number | null;
  carbsGMax: number | null;
  fatGMin: number | null;
  fatGMax: number | null;
  satietyScoreMin: number | null;
  satietyScoreMax: number | null;
};

export type NutritionGoalBand = 'under' | 'onTrack' | 'over';

export type NutritionGoalFieldProgress = {
  min: number | null;
  max: number | null;
  actual: number;
  delta: number;
  band: NutritionGoalBand;
};

export type NutritionGoalProgress = {
  calories: NutritionGoalFieldProgress | null;
  proteinG: NutritionGoalFieldProgress | null;
  carbsG: NutritionGoalFieldProgress | null;
  fatG: NutritionGoalFieldProgress | null;
  satietyScore: NutritionGoalFieldProgress | null;
};

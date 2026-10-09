export type NutritionStatus = 'pending' | 'ready' | 'failed';

/** Per-serving nutrition stored on a recipe version, plus whole-recipe weight. */
export type NutritionInfo = {
  servings: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
  /** Cooked/edible weight of the whole finished recipe, in grams. */
  preparedWeightG: number;
  disclaimer: string;
  satietyScore: number;
  status: NutritionStatus;
};

/** Nutrition fields projected onto list/detail recipe payloads. */
export type RecipeNutritionSummary = {
  satietyScore: number | null;
  nutritionStatus: NutritionStatus | null;
  calories: number | null;
  proteinG: number | null;
};

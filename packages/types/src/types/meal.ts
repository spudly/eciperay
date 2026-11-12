import type {AggregatedNutrition} from './aggregatedNutrition.js';
import type {RecipeNutritionSummary} from './nutrition.js';

export type MealRecipeMember = {
  recipeId: string;
  sortOrder: number;
  servings: number;
  title: string;
  imageUrl: string | null;
  recipeServings: number;
  accessLost: boolean;
} & RecipeNutritionSummary;

export type Meal = {
  id: string;
  userId: string;
  title: string;
  notes: string | null;
  memberCount: number;
  /**
   * Recipe members only (#498): `memberCount` also counts direct ingredients
   * (#362), so surfaces that label the count "recipes" must use this field
   * instead.
   */
  recipeCount: number;
  nutrition: AggregatedNutrition | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * A plain ingredient entered directly on a meal (#362) — not a recipe.
 * Nutrition is stored per serving, estimated at save time by the same lookup
 * full recipes use; `servings` is this entry's own servings within the meal
 * (#363), used to scale it in aggregation.
 */
export type MealIngredientMember = {
  name: string;
  quantity: number | null;
  unit: string | null;
  sortOrder: number;
  servings: number;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
  preparedWeightG: number | null;
} & RecipeNutritionSummary;

export type MealDetail = Meal & {
  members: MealRecipeMember[];
  ingredients: MealIngredientMember[];
};

export type MealRecipeInput = {recipeId: string; servings?: number};

/**
 * A one-off direct ingredient for a meal (#362). Nutrition is never entered by
 * the user: the server estimates and stores it at save time from
 * name/quantity/unit via the recipe nutrition lookup.
 */
export type MealIngredientInput = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  servings?: number;
};

export type MealInput = {
  title: string;
  notes?: string | null;
  /**
   * Optimistic-concurrency token for PUT: the `updatedAt` of the meal as read.
   * When present and stale, the server rejects the write with 409; when absent,
   * the write is unconditional (the pre-#384 behavior).
   */
  expectedUpdatedAt?: string;
  recipes: MealRecipeInput[];
  /**
   * Optional direct ingredients (#362); recipes + ingredients must total at
   * least one member.
   */
  ingredients?: MealIngredientInput[];
};

export type MealTimelineStep = {
  recipeId: string;
  recipeTitle: string;
  instructionId: string;
  stepNumber: number;
  body: string;
  durationMin: number;
  startOffsetMin: number;
  endOffsetMin: number;
};

export type MealCookPlan = {
  mealId: string;
  totalDurationMin: number;
  steps: MealTimelineStep[];
  timingStatus: 'ready' | 'partial' | 'failed';
};

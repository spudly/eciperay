import type {AggregatedNutrition} from './aggregatedNutrition.js';
import type {RecipeNutritionSummary} from './nutrition.js';

export type MealRecipeMember = {
  recipeId: string;
  sortOrder: number;
  /** Servings of the recipe cooked for this meal (#363). */
  servingsToCook: number;
  /**
   * Servings of the recipe the meal's owner eats (#363): meal nutrition is
   * computed from this number, not from what was cooked.
   */
  servingsToEat: number;
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
 * full recipes use (at the entry's servings-to-cook, which its quantity
 * covers); aggregation scales it by the entry's servings-to-eat (#363).
 */
export type MealIngredientMember = {
  name: string;
  quantity: number | null;
  unit: string | null;
  sortOrder: number;
  /** Servings of the entry cooked (#363); its quantity covers these. */
  servingsToCook: number;
  /** Servings of the entry the meal's owner eats (#363). */
  servingsToEat: number;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
  preparedWeightG: number | null;
} & RecipeNutritionSummary;

export type MealDetail = Meal & {
  members: MealRecipeMember[];
  ingredients: MealIngredientMember[];
};

export type MealRecipeInput = {
  recipeId: string;
  /** Defaults to the recipe's own servings. */
  servingsToCook?: number;
  /** Defaults to servingsToCook (eat = cook). */
  servingsToEat?: number;
};

/**
 * A one-off direct ingredient for a meal (#362). Nutrition is never entered by
 * the user: the server estimates and stores it at save time from
 * name/quantity/unit via the recipe nutrition lookup.
 */
export type MealIngredientInput = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  /** Defaults to 1. */
  servingsToCook?: number;
  /** Defaults to servingsToCook (eat = cook). */
  servingsToEat?: number;
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

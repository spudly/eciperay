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
  nutrition: AggregatedNutrition | null;
  createdAt: string;
  updatedAt: string;
};

export type MealDetail = Meal & {members: MealRecipeMember[]};

export type MealRecipeInput = {recipeId: string; servings?: number};

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

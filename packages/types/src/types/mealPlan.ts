import type {
  AggregatedNutrition,
  MealPlanNutrition,
} from './aggregatedNutrition.js';
import type {NutritionGoalProgress} from './nutritionGoals.js';
import type {RecipeNutritionSummary} from './nutrition.js';

export type MealPlanMealEntry = {
  type: 'meal';
  id: string;
  mealId: string;
  sortOrder: number;
  quantity: number;
  title: string;
  memberCount: number;
  nutrition: AggregatedNutrition | null;
};

export type MealPlanRecipeEntry = {
  type: 'recipe';
  id: string;
  recipeId: string;
  sortOrder: number;
  quantity: number;
  servings: number;
  title: string;
  imageUrl: string | null;
  recipeServings: number;
  accessLost: boolean;
  nutrition: AggregatedNutrition | null;
} & RecipeNutritionSummary;

export type MealPlanEntry = MealPlanMealEntry | MealPlanRecipeEntry;

export type MealPlan = {
  id: string;
  userId: string;
  title: string;
  notes: string | null;
  startsOn: string | null;
  endsOn: string | null;
  entryCount: number;
  nutrition: MealPlanNutrition | null;
  goalProgress: NutritionGoalProgress | null;
  createdAt: string;
  updatedAt: string;
};

export type MealPlanDetail = MealPlan & {entries: MealPlanEntry[]};

export type MealPlanMealEntryInput = {mealId: string; quantity?: number};

export type MealPlanRecipeEntryInput = {
  recipeId: string;
  servings?: number;
  quantity?: number;
};

export type MealPlanEntryInput =
  | MealPlanMealEntryInput
  | MealPlanRecipeEntryInput;

export type MealPlanInput = {
  title: string;
  notes?: string | null;
  startsOn?: string | null;
  endsOn?: string | null;
  entries: MealPlanEntryInput[];
};

export type ShoppingListSource = {
  mealId: string | null;
  mealTitle: string | null;
  recipeId: string;
  recipeTitle: string;
};

export type ShoppingListLine = {
  key: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  isOptional: boolean;
  sources: ShoppingListSource[];
};

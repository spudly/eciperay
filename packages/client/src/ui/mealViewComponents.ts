import type {
  AggregatedNutrition,
  Meal,
  MealCookPlan,
  MealDetail,
  MealPlan,
  MealPlanDetail,
  NutritionGoalProgress,
  NutritionGoals,
  ShoppingListLine,
} from '@eciperay/types';

export type MealsHubTab = 'meals' | 'plans';

export type MealsHubViewProps = {
  activeTab: MealsHubTab;
  onSelectTab: (tab: MealsHubTab) => void;
  meals: Meal[];
  plans: MealPlan[];
  isLoading: boolean;
  onCreateMeal: () => void;
  onCreatePlan: () => void;
  onMealPress: (mealId: string) => void;
  onPlanPress: (planId: string) => void;
  onDeleteMeal: (mealId: string) => void;
  onDeletePlan: (planId: string) => void;
};

export type MealDetailViewProps = {
  meal: MealDetail;
  onEdit: () => void;
  onCook: () => void;
  onRecipePress: (recipeId: string) => void;
};

export type MealFormRecipeOption = {
  id: string;
  title: string;
  servings: number;
};

export type MealFormViewProps = {
  title: string;
  notes: string;
  selectedRecipeIds: string[];
  recipeOptions: MealFormRecipeOption[];
  servingsByRecipeId: Record<string, number>;
  saving: boolean;
  error?: string | null;
  onTitleChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onToggleRecipe: (recipeId: string) => void;
  onServingsChange: (recipeId: string, servings: number) => void;
  onSubmit: () => void;
};

export type MealCookingModeViewProps = {
  plan: MealCookPlan;
  mealTitle: string;
  stepIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onDone: () => void;
};

export type MealPlanDetailViewProps = {
  plan: MealPlanDetail;
  onEdit: () => void;
  onShoppingList: () => void;
  onMealPress: (mealId: string) => void;
  onRecipePress: (recipeId: string) => void;
  onSetGoalsPress: () => void;
};

export type MealPlanFormEntryOption =
  | {kind: 'meal'; id: string; title: string}
  | {kind: 'recipe'; id: string; title: string; servings: number};

export type MealPlanFormViewProps = {
  title: string;
  notes: string;
  startsOn: string;
  endsOn: string;
  selectedKeys: string[];
  entryOptions: MealPlanFormEntryOption[];
  /**
   * True while the meals/recipes behind `entryOptions` are still loading; the
   * form shows a loading state for the list instead of "No items found."
   * (#260).
   */
  entryOptionsLoading?: boolean;
  quantityByKey: Record<string, number>;
  servingsByRecipeId: Record<string, number>;
  saving: boolean;
  error?: string | null;
  onTitleChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onStartsOnChange: (value: string) => void;
  onEndsOnChange: (value: string) => void;
  onToggleEntry: (key: string) => void;
  onQuantityChange: (key: string, quantity: number) => void;
  onRecipeServingsChange: (recipeId: string, servings: number) => void;
  onSubmit: () => void;
};

export type ShoppingListViewProps = {
  lines: ShoppingListLine[];
  isLoading: boolean;
  checkedKeys: Set<string>;
  onToggleChecked: (key: string) => void;
};

export type NutritionGoalsFormViewProps = {
  goals: NutritionGoals;
  saving: boolean;
  error?: string | null;
  onChange: (goals: NutritionGoals) => void;
  onSave: () => void;
};

export type NutritionGoalProgressViewProps = {
  progress: NutritionGoalProgress | null;
  nutrition: AggregatedNutrition | null;
  /**
   * True only when the progress figures are the plan's per-day average (the
   * server compared `nutrition.perDay`, which it sets only for a plan with a
   * valid date range). When false or omitted, the figures are whole-plan totals
   * — the server's fallback for undated plans — and the view must label them as
   * such, never as a daily average.
   */
  progressIsPerDayAverage?: boolean;
  onSetGoalsPress?: () => void;
};

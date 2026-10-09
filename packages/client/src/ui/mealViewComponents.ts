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
  onSetGoalsPress?: () => void;
};

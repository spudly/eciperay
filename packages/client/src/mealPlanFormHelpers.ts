import type {Meal, MealPlanDetail} from '@eciperay/types';

import {mealPlanEntryKey} from './mealUiHelpers.js';
import type {MealPlanFormEntryOption} from './ui/mealViewComponents.js';

export type MealPlanEditRecipeOption = {
  id: string;
  title: string;
  servings: number;
};

export type MealPlanFormDraft = {
  title: string;
  notes: string;
  startsOn: string;
  endsOn: string;
  selectedKeys: string[];
  quantityByKey: Record<string, number>;
  servingsByRecipeId: Record<string, number>;
};

export const mealPlanFormDraftFromDetail = (
  plan: MealPlanDetail,
): MealPlanFormDraft => {
  const keys: string[] = [];
  const quantities: Record<string, number> = {};
  const servings: Record<string, number> = {};
  for (const entry of plan.entries) {
    if (entry.type === 'meal') {
      const key = mealPlanEntryKey('meal', entry.mealId);
      keys.push(key);
      quantities[key] = entry.quantity;
    } else {
      const key = mealPlanEntryKey('recipe', entry.recipeId);
      keys.push(key);
      quantities[key] = entry.quantity;
      servings[entry.recipeId] = entry.servings;
    }
  }
  return {
    title: plan.title,
    notes: plan.notes ?? '',
    startsOn: plan.startsOn ?? '',
    endsOn: plan.endsOn ?? '',
    selectedKeys: keys,
    quantityByKey: quantities,
    servingsByRecipeId: servings,
  };
};

export const buildMealPlanFormEntryOptions = (
  meals: Meal[],
  recipes: MealPlanEditRecipeOption[],
): MealPlanFormEntryOption[] => [
  ...meals.map(
    meal => ({kind: 'meal', id: meal.id, title: meal.title}) as const,
  ),
  ...recipes.map(
    recipe =>
      ({
        kind: 'recipe',
        id: recipe.id,
        title: recipe.title,
        servings: recipe.servings,
      }) as const,
  ),
];

const nextServingsForRecipeEntry = (
  key: string,
  servingsByRecipeId: Record<string, number>,
  recipes: MealPlanEditRecipeOption[],
): Record<string, number> => {
  if (!key.startsWith('recipe:')) {
    return servingsByRecipeId;
  }
  const recipeId = key.slice('recipe:'.length);
  const recipe = recipes.find(item => item.id === recipeId);
  if (!recipe) {
    return servingsByRecipeId;
  }
  return {
    ...servingsByRecipeId,
    [recipeId]: servingsByRecipeId[recipeId] ?? recipe.servings,
  };
};

export const mealPlanEntryToggleResult = (args: {
  key: string;
  previous: string[];
  quantityByKey: Record<string, number>;
  servingsByRecipeId: Record<string, number>;
  recipes: MealPlanEditRecipeOption[];
}): {
  selectedKeys: string[];
  quantityByKey: Record<string, number>;
  servingsByRecipeId: Record<string, number>;
} => {
  const {key, previous, quantityByKey, servingsByRecipeId, recipes} = args;
  if (previous.includes(key)) {
    return {
      selectedKeys: previous.filter(item => item !== key),
      quantityByKey,
      servingsByRecipeId,
    };
  }
  return {
    selectedKeys: [...previous, key],
    quantityByKey: {...quantityByKey, [key]: quantityByKey[key] ?? 1},
    servingsByRecipeId: nextServingsForRecipeEntry(
      key,
      servingsByRecipeId,
      recipes,
    ),
  };
};

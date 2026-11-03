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

/**
 * Entry options for the entries a plan already carries, built from the plan
 * detail itself: under the search autocomplete (#359) a selected entry need not
 * appear in the current search results, so its view-model (title, and a
 * recipe's own servings) must come from the plan, not from a results lookup.
 */
export const buildMealPlanFormEntryOptionsFromDetail = (
  plan: MealPlanDetail,
): MealPlanFormEntryOption[] =>
  plan.entries.map(entry =>
    entry.type === 'meal'
      ? ({kind: 'meal', id: entry.mealId, title: entry.title} as const)
      : ({
          kind: 'recipe',
          id: entry.recipeId,
          title: entry.title,
          servings: entry.recipeServings,
        } as const),
  );

export const buildMealPlanFormEntryOptions = (
  meals: Meal[],
  recipes: MealPlanEditRecipeOption[],
): MealPlanFormEntryOption[] => {
  // The suggestion list is assembled from two sources concatenated here
  // (client-matched meals + server-searched recipes) — dedupe by entry
  // key (kind + id), first occurrence wins (#386), so the same recipe
  // (or meal) can never appear twice in the picker's suggestions even
  // if a source list itself contains it twice.
  const seenKeys = new Set<string>();
  const options: MealPlanFormEntryOption[] = [];
  const all: MealPlanFormEntryOption[] = [
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
  for (const option of all) {
    const key = mealPlanEntryKey(option.kind, option.id);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      options.push(option);
    }
  }
  return options;
};

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

import type {
  AggregatedNutrition,
  MealInput,
  MealPlanInput,
  NutritionGoals,
} from '@eciperay/types';

export const mealPlanEntryKey = (kind: 'meal' | 'recipe', id: string): string =>
  `${kind}:${id}`;

export const parseMealPlanEntryKey = (
  key: string,
): {kind: 'meal' | 'recipe'; id: string} => {
  const colon = key.indexOf(':');
  const kind = key.slice(0, colon);
  const id = key.slice(colon + 1);
  if (kind !== 'meal' && kind !== 'recipe') {
    throw new Error(`Invalid meal plan entry key: ${key}`);
  }
  return {kind, id};
};

export const formatSimpleNutrition = (
  nutrition: AggregatedNutrition | null | undefined,
): string | null => {
  if (!nutrition || nutrition.status === 'unavailable') {
    return null;
  }
  const parts = [
    `${Math.round(nutrition.calories)} cal`,
    `${Math.round(nutrition.proteinG)}g protein`,
  ];
  if (nutrition.satietyScore !== null) {
    parts.push(`satiety ${Math.round(nutrition.satietyScore)}`);
  }
  return parts.join(' · ');
};

export const buildMealInputFromForm = (args: {
  title: string;
  notes: string;
  selectedRecipeIds: string[];
  servingsByRecipeId: Record<string, number>;
}): MealInput => ({
  title: args.title.trim(),
  notes: args.notes.trim() || null,
  recipes: args.selectedRecipeIds.map(recipeId => ({
    recipeId,
    servings: args.servingsByRecipeId[recipeId],
  })),
});

export const buildMealPlanInputFromForm = (args: {
  title: string;
  notes: string;
  startsOn: string;
  endsOn: string;
  selectedKeys: string[];
  quantityByKey: Record<string, number>;
  servingsByRecipeId: Record<string, number>;
}): MealPlanInput => ({
  title: args.title.trim(),
  notes: args.notes.trim() || null,
  startsOn: args.startsOn.trim() || null,
  endsOn: args.endsOn.trim() || null,
  entries: args.selectedKeys.map(key => {
    const {kind, id} = parseMealPlanEntryKey(key);
    if (kind === 'meal') {
      return {mealId: id, quantity: args.quantityByKey[key] ?? 1};
    }
    return {
      recipeId: id,
      quantity: args.quantityByKey[key] ?? 1,
      servings: args.servingsByRecipeId[id],
    };
  }),
});

export const defaultNutritionGoals = (): NutritionGoals => ({
  calories: null,
  proteinG: null,
  carbsG: null,
  fatG: null,
  satietyScore: null,
});

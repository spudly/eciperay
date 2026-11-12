import type {
  AggregatedNutrition,
  MealIngredientInput,
  MealIngredientMember,
  MealInput,
  MealPlanInput,
  MealPlanNutrition,
  NutritionGoals,
} from '@eciperay/types';

/**
 * One direct-ingredient row of the meal form (#362 tranche 2), mirroring the DS
 * MealFormPage ingredient shape: quantity / unit / servings cross the DS
 * boundary as free-text strings, so the row keeps them as entered and
 * parsing/validation happens host-side in buildMealInputFromForm.
 */
export type MealFormIngredient = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  /** Servings to cook, as entered (#363). */
  servings: string;
  /** Servings to eat, as entered (#363); defaults to cook when blank. */
  servingsToEat: string;
};

export const mealIngredientsToForm = (
  ingredients: MealIngredientMember[],
): MealFormIngredient[] =>
  ingredients.map((ingredient, index) => ({
    id: `ingredient-${index}`,
    name: ingredient.name,
    quantity: ingredient.quantity === null ? '' : String(ingredient.quantity),
    unit: ingredient.unit ?? '',
    servings: String(ingredient.servingsToCook),
    servingsToEat: String(ingredient.servingsToEat),
  }));

const parseFormIngredient = (
  formIngredient: MealFormIngredient,
): MealIngredientInput | null => {
  const name = formIngredient.name.trim();
  if (!name) {
    return null;
  }
  // Mirror the server schema's caps (MealInputSchema: name ≤ 200, unit
  // ≤ 50, servings a positive integer) so an over-limit entry fails here
  // with a field-specific message instead of a generic server rejection.
  if (name.length > 200) {
    throw new Error('Enter an ingredient name of 200 characters or fewer.');
  }
  const unit = formIngredient.unit.trim();
  if (unit.length > 50) {
    throw new Error(`Enter a unit of 50 characters or fewer for “${name}”.`);
  }
  const quantityText = formIngredient.quantity.trim();
  const quantity = quantityText === '' ? null : Number(quantityText);
  if (quantity !== null && (!Number.isFinite(quantity) || quantity <= 0)) {
    throw new Error(`Enter a valid quantity for “${name}”.`);
  }
  const servingsText = formIngredient.servings.trim();
  const servingsToCook = servingsText === '' ? 1 : Number(servingsText);
  if (!Number.isInteger(servingsToCook) || servingsToCook <= 0) {
    throw new Error(`Enter valid servings to cook for “${name}”.`);
  }
  const servingsToEatText = formIngredient.servingsToEat.trim();
  const servingsToEat =
    servingsToEatText === '' ? servingsToCook : Number(servingsToEatText);
  if (!Number.isInteger(servingsToEat) || servingsToEat <= 0) {
    throw new Error(`Enter valid servings to eat for “${name}”.`);
  }
  return {name, quantity, unit: unit || null, servingsToCook, servingsToEat};
};

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
    `${Math.round(nutrition.carbsG)}g carbs`,
    `${Math.round(nutrition.fatG)}g fat`,
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
  /** Servings to cook by recipe id (#363). */
  servingsByRecipeId: Record<string, number>;
  /**
   * Servings to eat by recipe id (#363); a missing entry defaults server-side
   * to that entry's servings-to-cook (eat = cook).
   */
  servingsToEatByRecipeId?: Record<string, number>;
  /**
   * The form's direct-ingredient rows (#362). Omitted means the caller does not
   * manage direct ingredients, so the payload omits them too (the server
   * preserves stored rows on an omitted list); a provided list — empty included
   * — is sent in full and replaces them.
   */
  formIngredients?: MealFormIngredient[];
}): MealInput => ({
  title: args.title.trim(),
  notes: args.notes.trim() || null,
  recipes: args.selectedRecipeIds.map(recipeId => ({
    recipeId,
    servingsToCook: args.servingsByRecipeId[recipeId],
    servingsToEat: args.servingsToEatByRecipeId?.[recipeId],
  })),
  ...(args.formIngredients
    ? {
        ingredients: args.formIngredients
          .map(parseFormIngredient)
          .filter(
            (ingredient): ingredient is MealIngredientInput =>
              ingredient !== null,
          ),
      }
    : {}),
});

export const buildMealPlanInputFromForm = (args: {
  title: string;
  notes: string;
  startsOn: string;
  endsOn: string;
  selectedKeys: string[];
  quantityByKey: Record<string, number>;
  /** Servings to cook by recipe id (#363). */
  servingsByRecipeId: Record<string, number>;
  /**
   * Servings to eat by recipe id (#363); a missing entry defaults server-side
   * to that entry's servings-to-cook (eat = cook).
   */
  servingsToEatByRecipeId?: Record<string, number>;
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
      servingsToCook: args.servingsByRecipeId[id],
      servingsToEat: args.servingsToEatByRecipeId?.[id],
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

/**
 * The DS MealPlanDetailPage weekly-totals band's view-model (#363 / DS #414):
 * the plan's eaten totals and per-day averages as pre-labelled rows. Totals
 * come from the plan nutrition itself; averages from its `perDay` (null for
 * undated plans, in which case the band carries totals only). Returns null when
 * there is no usable nutrition, so hosts can pass the result straight to the
 * page.
 */
export const buildWeeklyTotalsBand = (
  nutrition: MealPlanNutrition | null | undefined,
): {
  totals: {label: string; valueLabel: string}[];
  averages: {label: string; valueLabel: string}[];
} | null => {
  if (!nutrition || nutrition.status === 'unavailable') {
    return null;
  }
  const fields: {
    label: string;
    pick: (n: AggregatedNutrition) => number;
    format: (value: number) => string;
  }[] = [
    {
      label: 'Calories',
      pick: n => n.calories,
      format: v => `${Math.round(v)} cal`,
    },
    {
      label: 'Protein',
      pick: n => n.proteinG,
      format: v => `${Math.round(v)}g protein`,
    },
    {
      label: 'Carbs',
      pick: n => n.carbsG,
      format: v => `${Math.round(v)}g carbs`,
    },
    {label: 'Fat', pick: n => n.fatG, format: v => `${Math.round(v)}g fat`},
  ];
  const totals = fields.map(field => ({
    label: `${field.label} · Weekly total`,
    valueLabel: field.format(field.pick(nutrition)),
  }));
  const averages = nutrition.perDay
    ? fields.map(field => ({
        label: `${field.label} · Daily average`,
        valueLabel: field.format(
          field.pick(nutrition.perDay as AggregatedNutrition),
        ),
      }))
    : [];
  return {totals, averages};
};

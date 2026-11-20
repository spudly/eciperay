import type {
  AggregatedNutrition,
  MealIngredientInput,
  MealIngredientMember,
  MealInput,
  MealPlanInput,
  MealPlanNutrition,
  NutritionGoals,
} from '@eciperay/types';

import {netCarbsG} from './nutritionTabRows.js';

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
  // ≤ 50, servings-to-cook a positive integer, servings-to-eat any
  // non-negative number) so an over-limit entry fails here
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
  if (!Number.isInteger(servingsToCook) || servingsToCook < 0) {
    throw new Error(`Enter valid servings to cook for “${name}”.`);
  }
  const servingsToEatText = formIngredient.servingsToEat.trim();
  // Blank eat defaults to cook (#363); cook 0 = leftovers (#540), so a
  // blank eat falls back to 1 instead of following cook to 0 — mirroring
  // the server's positive fallback in saveMeal. An explicitly entered
  // eat may be 0 (eats none) or fractional (#541).
  const servingsToEat =
    servingsToEatText === ''
      ? servingsToCook > 0
        ? servingsToCook
        : 1
      : Number(servingsToEatText);
  // Servings-to-eat may be 0 (eats none) or fractional (#541); only the
  // cook side stays an integer.
  if (!Number.isFinite(servingsToEat) || servingsToEat < 0) {
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
  // Net carbs beside total carbs (#613), computed by the canonical helper
  // from the summed values; omitted when any contributor's fiber is
  // unknown (the aggregate fiber is then null).
  const net = netCarbsG(nutrition);
  if (net !== null) {
    parts.splice(3, 0, `${Math.round(net)}g net carbs`);
  }
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
  /**
   * Day assignment by entry key (#539): `YYYY-MM-DD`, or '' / missing for no
   * day. Sent as `day` only when non-empty, so an unassigned entry stays
   * day-less instead of being pinned to a fabricated date.
   */
  dayByKey?: Record<string, string>;
}): MealPlanInput => ({
  title: args.title.trim(),
  notes: args.notes.trim() || null,
  startsOn: args.startsOn.trim() || null,
  endsOn: args.endsOn.trim() || null,
  entries: args.selectedKeys.map(key => {
    const {kind, id} = parseMealPlanEntryKey(key);
    const day = args.dayByKey?.[key]?.trim() || null;
    if (kind === 'meal') {
      return {mealId: id, quantity: args.quantityByKey[key] ?? 1, day};
    }
    return {
      recipeId: id,
      quantity: args.quantityByKey[key] ?? 1,
      servingsToCook: args.servingsByRecipeId[id],
      servingsToEat: args.servingsToEatByRecipeId?.[id],
      day,
    };
  }),
});

export const defaultNutritionGoals = (): NutritionGoals => ({
  caloriesMin: null,
  caloriesMax: null,
  proteinGMin: null,
  proteinGMax: null,
  carbsGMin: null,
  carbsGMax: null,
  fatGMin: null,
  fatGMax: null,
  satietyScoreMin: null,
  satietyScoreMax: null,
});

/**
 * The DS MealPlanDetailPage weekly-totals band's view-model (#363 / DS #414):
 * the plan's eaten totals and per-day averages as field-labelled rows (the DS
 * page composes the "· Weekly total" / "· Daily average" wording and pairs rows
 * by label). Totals come from the plan nutrition itself; averages from its
 * `perDay` (null for undated plans, in which case the band carries totals
 * only). Returns null when there is no usable nutrition, so hosts can pass the
 * result straight to the page.
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
  // DS #414 contract: rows are labelled by field only — the DS page
  // pairs each average to its total by exact label match and composes
  // the kind wording into the rendered label itself ("Calories ·
  // Weekly total" / "Calories · Daily average").
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
    label: field.label,
    valueLabel: field.format(field.pick(nutrition)),
  }));
  const averages = nutrition.perDay
    ? fields.map(field => ({
        label: field.label,
        valueLabel: field.format(
          field.pick(nutrition.perDay as AggregatedNutrition),
        ),
      }))
    : [];
  // Net carbs row (#613) sits immediately after Carbs in both bands, via
  // the canonical helper on the summed values; omitted when fiber is
  // unknown. The DS pairs totals/averages by label, and both bands omit
  // together because per-day fiber is unknown exactly when total fiber is.
  const netTotal = netCarbsG(nutrition);
  if (netTotal !== null) {
    const carbsIndex = totals.findIndex(row => row.label === 'Carbs');
    totals.splice(carbsIndex + 1, 0, {
      label: 'Net carbs',
      valueLabel: `${Math.round(netTotal)}g net carbs`,
    });
    const netAverage = nutrition.perDay ? netCarbsG(nutrition.perDay) : null;
    if (netAverage !== null) {
      const avgCarbsIndex = averages.findIndex(row => row.label === 'Carbs');
      averages.splice(avgCarbsIndex + 1, 0, {
        label: 'Net carbs',
        valueLabel: `${Math.round(netAverage)}g net carbs`,
      });
    }
  }
  return {totals, averages};
};

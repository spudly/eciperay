import type {NutritionInfo} from '@eciperay/types';

export type NutritionTabRow = {label: string; value: number; unit: string};

/**
 * The one canonical net-carbs derivation (#613): carbs − fiber. Returns
 * null when either input is missing — net carbs cannot be computed then,
 * and surfaces omit it (Stephen's ruling on the #613 plan, 2026-11-19).
 * Aggregates pass their summed carbs/fiber, so a total's net is computed
 * from the summed values, never averaged from per-recipe nets.
 */
export const netCarbsG = (nutrition: {
  carbsG: number | null | undefined;
  fiberG: number | null | undefined;
}): number | null =>
  typeof nutrition.carbsG === 'number' &&
  typeof nutrition.fiberG === 'number'
    ? nutrition.carbsG - nutrition.fiberG
    : null;

const optionalNutritionRows = (data: NutritionInfo): NutritionTabRow[] => {
  const candidates: {label: string; value: number | null; unit: string}[] = [
    {label: 'Fiber', value: data.fiberG, unit: 'g'},
    {label: 'Sugar', value: data.sugarG, unit: 'g'},
    {label: 'Sodium', value: data.sodiumMg, unit: 'mg'},
  ];
  return candidates.flatMap(row =>
    typeof row.value === 'number'
      ? [{label: row.label, value: row.value, unit: row.unit}]
      : [],
  );
};

export const nutritionTabRows = (data: NutritionInfo): NutritionTabRow[] => [
  {label: 'Satiety score', value: data.satietyScore, unit: ''},
  {label: 'Calories', value: data.calories, unit: ''},
  {label: 'Protein', value: data.proteinG, unit: 'g'},
  {label: 'Carbs', value: data.carbsG, unit: 'g'},
  // Net carbs renders immediately after total carbs wherever the recipe
  // detail shows carbs (#613); omitted when fiber is unknown.
  ...(() => {
    const net = netCarbsG(data);
    return net === null
      ? []
      : [{label: 'Net carbs', value: net, unit: 'g'}];
  })(),
  {label: 'Fat', value: data.fatG, unit: 'g'},
  ...optionalNutritionRows(data),
  {label: 'Prepared weight (recipe)', value: data.preparedWeightG, unit: 'g'},
];

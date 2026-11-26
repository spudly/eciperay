import type {NutritionInfo} from '@eciperay/types';

export type NutritionTabRow = {label: string; value: number; unit: string};

/**
 * The one canonical net-carbs derivation (#613): carbs − fiber. Returns null
 * when either input is missing — net carbs cannot be computed then, and
 * surfaces omit it (Stephen's ruling on the #613 plan, 2026-11-19). Aggregates
 * pass their summed carbs/fiber, so a total's net is computed from the summed
 * values, never averaged from per-recipe nets.
 */
export const netCarbsG = (nutrition: {
  carbsG?: number | null;
  fiberG?: number | null;
}): number | null =>
  typeof nutrition.carbsG === 'number' && typeof nutrition.fiberG === 'number'
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
    return net === null ? [] : [{label: 'Net carbs', value: net, unit: 'g'}];
  })(),
  {label: 'Fat', value: data.fatG, unit: 'g'},
  ...optionalNutritionRows(data),
  {label: 'Prepared weight (recipe)', value: data.preparedWeightG, unit: 'g'},
];

export type NutritionFactKind =
  | 'totalFat'
  | 'saturatedFat'
  | 'transFat'
  | 'cholesterol'
  | 'sodium'
  | 'totalCarbohydrate'
  | 'dietaryFiber'
  | 'totalSugars'
  | 'addedSugars'
  | 'protein'
  | 'netCarbs'
  | 'vitaminD'
  | 'calcium'
  | 'iron'
  | 'potassium';

export type NutritionFact = {
  kind: NutritionFactKind;
  amountLabel: string;
  dailyValueLabel?: string;
};

export type NutritionFacts = {
  servingSizeLabel: string;
  servingsPerContainerLabel?: string;
  caloriesLabel: string;
  nutrients: NutritionFact[];
};

// FDA daily values (g/mg) for the nutrients Eciperay estimates, used
// only to format the % Daily Value column of the DS Nutrition Facts
// label (#722 contract in @spudly/ui 14).
const DAILY_VALUES: Partial<Record<NutritionFactKind, number>> = {
  totalFat: 78,
  sodium: 2300,
  totalCarbohydrate: 275,
  dietaryFiber: 28,
  protein: 50,
};

const dailyValueLabel = (
  kind: NutritionFactKind,
  value: number,
): string | undefined => {
  const daily = DAILY_VALUES[kind];
  return daily === undefined
    ? undefined
    : `${Math.round((value / daily) * 100)}%`;
};

const fact = (
  kind: NutritionFactKind,
  value: number | null,
  unit: string,
): NutritionFact[] => {
  if (typeof value !== 'number') {
    return [];
  }
  const dv = dailyValueLabel(kind, value);
  return [
    {
      kind,
      amountLabel: `${value}${unit}`,
      ...(dv !== undefined ? {dailyValueLabel: dv} : {}),
    },
  ];
};

/**
 * The structured Nutrition Facts view-model for the DS 14 NutritionPanelData
 * contract: serving block, prominent calories, and the nutrient hierarchy,
 * built from the stored per-serving NutritionInfo. Nutrients Eciperay does not
 * estimate (saturated fat, cholesterol, vitamins, …) are omitted rather than
 * invented; satiety and prepared weight are not label nutrients and stay on
 * nutritionTabRows for the other surfaces that use them.
 */
export const nutritionFacts = (data: NutritionInfo): NutritionFacts => {
  const perServingWeightG =
    data.servings > 0 && data.preparedWeightG > 0
      ? Math.round(data.preparedWeightG / data.servings)
      : null;
  return {
    servingSizeLabel:
      perServingWeightG !== null
        ? `1 serving (${perServingWeightG}g)`
        : '1 serving',
    ...(data.servings > 0
      ? {
          servingsPerContainerLabel: `about ${data.servings} serving${data.servings === 1 ? '' : 's'} per container`,
        }
      : {}),
    caloriesLabel: `${data.calories}`,
    nutrients: [
      ...fact('totalFat', data.fatG, 'g'),
      ...fact('sodium', data.sodiumMg, 'mg'),
      ...fact('totalCarbohydrate', data.carbsG, 'g'),
      ...fact('dietaryFiber', data.fiberG, 'g'),
      ...fact('totalSugars', data.sugarG, 'g'),
      ...fact('netCarbs', netCarbsG(data), 'g'),
      ...fact('protein', data.proteinG, 'g'),
    ],
  };
};

import type {NutritionInfo} from '@eciperay/types';

export type NutritionTabRow = {label: string; value: number; unit: string};

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
  {label: 'Fat', value: data.fatG, unit: 'g'},
  ...optionalNutritionRows(data),
  {label: 'Prepared weight (recipe)', value: data.preparedWeightG, unit: 'g'},
];

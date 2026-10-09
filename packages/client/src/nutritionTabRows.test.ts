import type {NutritionInfo} from '@eciperay/types';

import {nutritionTabRows} from './nutritionTabRows.js';

const baseNutrition = (): NutritionInfo => ({
  servings: 4,
  calories: 400,
  proteinG: 20,
  carbsG: 40,
  fatG: 10,
  fiberG: null,
  sugarG: null,
  sodiumMg: null,
  preparedWeightG: 800,
  disclaimer: '',
  satietyScore: 65,
  status: 'ready',
});

describe('nutritionTabRows', () => {
  test('includes core rows and omits null optionals', () => {
    const rows = nutritionTabRows(baseNutrition());
    expect(rows.map(row => row.label)).toEqual([
      'Satiety score',
      'Calories',
      'Protein',
      'Carbs',
      'Fat',
      'Prepared weight (recipe)',
    ]);
  });

  test('includes optional fiber sugar and sodium when present', () => {
    const rows = nutritionTabRows({
      ...baseNutrition(),
      fiberG: 5,
      sugarG: 3,
      sodiumMg: 200,
    });
    expect(rows.map(row => row.label)).toContain('Fiber');
    expect(rows.map(row => row.label)).toContain('Sugar');
    expect(rows.map(row => row.label)).toContain('Sodium');
  });
});

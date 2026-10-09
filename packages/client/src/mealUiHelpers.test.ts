import {
  buildMealInputFromForm,
  buildMealPlanInputFromForm,
  defaultNutritionGoals,
  formatSimpleNutrition,
  mealPlanEntryKey,
  parseMealPlanEntryKey,
} from './mealUiHelpers.js';

describe('mealUiHelpers', () => {
  test('returns null for unavailable nutrition', () => {
    expect(formatSimpleNutrition(null)).toBeNull();
    expect(
      formatSimpleNutrition({
        calories: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
        fiberG: 0,
        sugarG: 0,
        sodiumMg: 0,
        preparedWeightG: 0,
        satietyScore: null,
        status: 'unavailable',
      }),
    ).toBeNull();
  });

  test('rejects invalid meal plan entry keys', () => {
    expect(() => parseMealPlanEntryKey('bad:key')).toThrow(/Invalid meal plan/);
  });

  test('defaultNutritionGoals returns empty goals', () => {
    expect(defaultNutritionGoals()).toEqual({
      calories: null,
      proteinG: null,
      carbsG: null,
      fatG: null,
      satietyScore: null,
    });
  });

  test('formats nutrition summary', () => {
    expect(
      formatSimpleNutrition({
        calories: 500.4,
        proteinG: 20.2,
        carbsG: 40,
        fatG: 10,
        fiberG: 0,
        sugarG: 0,
        sodiumMg: 0,
        preparedWeightG: 400,
        satietyScore: 55,
        status: 'ready',
      }),
    ).toBe('500 cal · 20g protein · satiety 55');
  });

  test('builds meal and plan inputs', () => {
    expect(
      buildMealInputFromForm({
        title: ' Dinner ',
        notes: ' notes ',
        selectedRecipeIds: ['r1'],
        servingsByRecipeId: {r1: 3},
      }),
    ).toEqual({
      title: 'Dinner',
      notes: 'notes',
      recipes: [{recipeId: 'r1', servings: 3}],
    });

    expect(
      buildMealInputFromForm({
        title: 'Dinner',
        notes: '',
        selectedRecipeIds: ['r1'],
        servingsByRecipeId: {},
      }),
    ).toEqual({
      title: 'Dinner',
      notes: null,
      recipes: [{recipeId: 'r1', servings: undefined}],
    });

    const key = mealPlanEntryKey('meal', 'm1');
    expect(parseMealPlanEntryKey(key)).toEqual({kind: 'meal', id: 'm1'});
    const recipeKey = mealPlanEntryKey('recipe', 'r1');
    expect(
      buildMealPlanInputFromForm({
        title: 'Week',
        notes: '',
        startsOn: '2026-01-01',
        endsOn: '2026-01-07',
        selectedKeys: [key, recipeKey],
        quantityByKey: {[key]: 2, [recipeKey]: 1},
        servingsByRecipeId: {r1: 2},
      }).entries,
    ).toEqual([
      {mealId: 'm1', quantity: 2},
      {recipeId: 'r1', quantity: 1, servings: 2},
    ]);

    expect(
      buildMealPlanInputFromForm({
        title: ' Week ',
        notes: ' ',
        startsOn: ' ',
        endsOn: ' ',
        selectedKeys: [key, recipeKey],
        quantityByKey: {},
        servingsByRecipeId: {},
      }),
    ).toMatchObject({
      title: 'Week',
      notes: null,
      startsOn: null,
      endsOn: null,
      entries: [
        {mealId: 'm1', quantity: 1},
        {recipeId: 'r1', quantity: 1, servings: undefined},
      ],
    });
  });
});

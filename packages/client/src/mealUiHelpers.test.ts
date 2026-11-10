import {
  buildMealInputFromForm,
  buildMealPlanInputFromForm,
  defaultNutritionGoals,
  formatSimpleNutrition,
  mealIngredientsToForm,
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
    ).toBe('500 cal · 20g protein · 40g carbs · 10g fat · satiety 55');
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

  test('builds direct ingredients from form rows (#362)', () => {
    const input = buildMealInputFromForm({
      title: 'Dinner',
      notes: '',
      selectedRecipeIds: [],
      servingsByRecipeId: {},
      formIngredients: [
        {id: 'a', name: ' Rice ', quantity: '2', unit: ' cups ', servings: '2'},
        {id: 'b', name: 'Protein shake', quantity: '', unit: '', servings: ''},
        {id: 'c', name: '  ', quantity: '1', unit: '', servings: '1'},
      ],
    });
    expect(input.ingredients).toEqual([
      {name: 'Rice', quantity: 2, unit: 'cups', servings: 2},
      {name: 'Protein shake', quantity: null, unit: null, servings: 1},
    ]);

    // An explicitly empty row list still sends the key (full replace),
    // while omitting the rows omits the key entirely.
    expect(
      buildMealInputFromForm({
        title: 'Dinner',
        notes: '',
        selectedRecipeIds: [],
        servingsByRecipeId: {},
        formIngredients: [],
      }).ingredients,
    ).toEqual([]);
    expect(
      buildMealInputFromForm({
        title: 'Dinner',
        notes: '',
        selectedRecipeIds: [],
        servingsByRecipeId: {},
      }),
    ).not.toHaveProperty('ingredients');

    expect(() =>
      buildMealInputFromForm({
        title: 'Dinner',
        notes: '',
        selectedRecipeIds: [],
        servingsByRecipeId: {},
        formIngredients: [
          {id: 'a', name: 'Rice', quantity: 'lots', unit: '', servings: '1'},
        ],
      }),
    ).toThrow(/valid quantity/);
  });

  test('hydrates form rows from stored meal ingredients (#362)', () => {
    expect(
      mealIngredientsToForm([
        {
          name: 'Rice',
          quantity: 2,
          unit: 'cups',
          sortOrder: 0,
          servings: 2,
          fiberG: null,
          sugarG: null,
          sodiumMg: null,
          preparedWeightG: null,
          calories: 100,
          proteinG: 3,
          carbsG: 20,
          fatG: 1,
          satietyScore: null,
          nutritionStatus: 'ready',
        },
      ]),
    ).toEqual([
      {
        id: 'ingredient-0',
        name: 'Rice',
        quantity: '2',
        unit: 'cups',
        servings: '2',
      },
    ]);
  });
});

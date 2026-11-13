import {
  buildMealInputFromForm,
  buildWeeklyTotalsBand,
  buildMealPlanInputFromForm,
  defaultNutritionGoals,
  formatSimpleNutrition,
  mealIngredientsToForm,
  mealPlanEntryKey,
  parseMealPlanEntryKey,
  type MealFormIngredient,
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
      recipes: [{recipeId: 'r1', servingsToCook: 3, servingsToEat: undefined}],
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
      recipes: [
        {recipeId: 'r1', servingsToCook: undefined, servingsToEat: undefined},
      ],
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
      {
        recipeId: 'r1',
        quantity: 1,
        servingsToCook: 2,
        servingsToEat: undefined,
      },
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
        {
          recipeId: 'r1',
          quantity: 1,
          servingsToCook: undefined,
          servingsToEat: undefined,
        },
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
        {
          id: 'a',
          name: ' Rice ',
          quantity: '2',
          unit: ' cups ',
          servings: '2',
          servingsToEat: '1',
        },
        {
          id: 'b',
          name: 'Protein shake',
          quantity: '',
          unit: '',
          servings: '',
          servingsToEat: '',
        },
        {
          id: 'c',
          name: '  ',
          quantity: '1',
          unit: '',
          servings: '1',
          servingsToEat: '1',
        },
      ],
    });
    expect(input.ingredients).toEqual([
      {
        name: 'Rice',
        quantity: 2,
        unit: 'cups',
        servingsToCook: 2,
        servingsToEat: 1,
      },
      // A blank eat field defaults to the entry's servings-to-cook.
      {
        name: 'Protein shake',
        quantity: null,
        unit: null,
        servingsToCook: 1,
        servingsToEat: 1,
      },
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
          {
            id: 'a',
            name: 'Rice',
            quantity: 'lots',
            unit: '',
            servings: '1',
            servingsToEat: '1',
          },
        ],
      }),
    ).toThrow(/valid quantity/);

    // The parser mirrors the server schema's caps so over-limit entries
    // fail here with a field-specific message, not a generic rejection.
    const build = (formIngredients: MealFormIngredient[]) => () =>
      buildMealInputFromForm({
        title: 'Dinner',
        notes: '',
        selectedRecipeIds: [],
        servingsByRecipeId: {},
        formIngredients,
      });
    expect(
      build([
        {
          id: 'a',
          name: 'x'.repeat(200),
          quantity: '',
          unit: 'u'.repeat(50),
          servings: '1',
          servingsToEat: '1',
        },
      ])().ingredients,
    ).toHaveLength(1);
    expect(
      build([
        {
          id: 'a',
          name: 'x'.repeat(201),
          quantity: '',
          unit: '',
          servings: '1',
          servingsToEat: '1',
        },
      ]),
    ).toThrow(/200 characters/);
    expect(
      build([
        {
          id: 'a',
          name: 'Rice',
          quantity: '',
          unit: 'u'.repeat(51),
          servings: '1',
          servingsToEat: '1',
        },
      ]),
    ).toThrow(/50 characters/);
    expect(
      build([
        {
          id: 'a',
          name: 'Rice',
          quantity: '',
          unit: '',
          servings: '1.5',
          servingsToEat: '1',
        },
      ]),
    ).toThrow(/valid servings to cook/);
  });

  test('hydrates form rows from stored meal ingredients (#362)', () => {
    expect(
      mealIngredientsToForm([
        {
          name: 'Rice',
          quantity: 2,
          unit: 'cups',
          sortOrder: 0,
          servingsToCook: 4,
          servingsToEat: 2,
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
        servings: '4',
        servingsToEat: '2',
      },
    ]);
  });

  test('builds the weekly totals band from eaten totals and per-day averages (#363)', () => {
    const nutrition = {
      calories: 1400,
      proteinG: 70,
      carbsG: 140,
      fatG: 35,
      fiberG: 14,
      sugarG: 7,
      sodiumMg: 700,
      preparedWeightG: 1400,
      satietyScore: 50,
      status: 'ready' as const,
      perDay: {
        calories: 200,
        proteinG: 10,
        carbsG: 20,
        fatG: 5,
        fiberG: 2,
        sugarG: 1,
        sodiumMg: 100,
        preparedWeightG: 200,
        satietyScore: 50,
        status: 'ready' as const,
      },
    };
    expect(buildWeeklyTotalsBand(nutrition)).toEqual({
      totals: [
        {label: 'Calories', valueLabel: '1400 cal'},
        {label: 'Protein', valueLabel: '70g protein'},
        {label: 'Carbs', valueLabel: '140g carbs'},
        {label: 'Fat', valueLabel: '35g fat'},
      ],
      averages: [
        {label: 'Calories', valueLabel: '200 cal'},
        {label: 'Protein', valueLabel: '10g protein'},
        {label: 'Carbs', valueLabel: '20g carbs'},
        {label: 'Fat', valueLabel: '5g fat'},
      ],
    });
    expect(buildWeeklyTotalsBand(null)).toBeNull();
    expect(
      buildWeeklyTotalsBand({...nutrition, perDay: null})?.averages,
    ).toEqual([]);
  });
});

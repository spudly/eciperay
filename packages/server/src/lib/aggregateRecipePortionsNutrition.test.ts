import {
  aggregatePlanNutrition,
  aggregateRecipePortionsNutrition,
  planDayCount,
  scalePortion,
} from './aggregateRecipePortionsNutrition.js';

const readyPortion = {
  servings: 2,
  recipeServings: 4,
  calories: 100,
  proteinG: 10,
  carbsG: 20,
  fatG: 5,
  fiberG: 2,
  sugarG: 1,
  sodiumMg: 100,
  preparedWeightG: 400,
  nutritionStatus: 'ready',
};

describe('aggregateRecipePortionsNutrition', () => {
  test('scales and sums ready portions', () => {
    const result = aggregateRecipePortionsNutrition([readyPortion]);
    expect(result.status).toBe('ready');
    expect(result.calories).toBe(50);
    expect(result.proteinG).toBe(5);
    expect(result.preparedWeightG).toBe(200);
    expect(result.satietyScore).not.toBeNull();
  });

  test('treats missing optional macros as zero when scaling', () => {
    const result = aggregateRecipePortionsNutrition([
      {...readyPortion, fiberG: null, sugarG: null, sodiumMg: null},
    ]);
    expect(result.fiberG).toBe(0);
    expect(result.sugarG).toBe(0);
    expect(result.sodiumMg).toBe(0);
  });

  test('treats null core macros as zero when scaling', () => {
    expect(
      scalePortion({
        servings: 2,
        recipeServings: 4,
        calories: null,
        proteinG: null,
        carbsG: null,
        fatG: null,
        fiberG: null,
        sugarG: null,
        sodiumMg: null,
        preparedWeightG: null,
        nutritionStatus: 'ready',
      }),
    ).toEqual({
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 0,
      preparedWeightG: 0,
    });
  });

  test('marks partial when some portions lack nutrition', () => {
    const result = aggregateRecipePortionsNutrition([
      readyPortion,
      {...readyPortion, nutritionStatus: 'pending', calories: null},
    ]);
    expect(result.status).toBe('partial');
  });
});

describe('aggregatePlanNutrition', () => {
  test('multiplies entry quantity and computes per-day', () => {
    const mealNutrition = aggregateRecipePortionsNutrition([readyPortion]);
    const result = aggregatePlanNutrition(
      [{kind: 'aggregated', nutrition: mealNutrition, quantity: 2}],
      2,
    );
    expect(result.calories).toBe(100);
    expect(result.perDay?.calories).toBe(50);
  });
});

describe('planDayCount', () => {
  test('counts inclusive days', () => {
    expect(planDayCount('2026-01-01', '2026-01-03')).toBe(3);
  });

  test('returns null without both dates', () => {
    expect(planDayCount('2026-01-01', null)).toBeNull();
  });

  test('returns null for invalid ranges', () => {
    expect(planDayCount('2026-01-07', '2026-01-01')).toBeNull();
    expect(planDayCount('not-a-date', '2026-01-01')).toBeNull();
  });
});

describe('aggregateRecipePortionsNutrition satiety', () => {
  test('omits satiety when prepared weight is zero', () => {
    const result = aggregateRecipePortionsNutrition([
      {...readyPortion, preparedWeightG: 0},
    ]);
    expect(result.satietyScore).toBeNull();
  });

  test('omits satiety instead of throwing when a ready portion has zero calories', () => {
    // A ready portion only requires calories to be a number, so a
    // zero-calorie recipe with a positive prepared weight reached
    // calculateSatiety, which throws for non-positive calories — 500ing
    // every meal / meal-plan load that aggregates the recipe (#358/#360
    // paths: plan detail, plan list, and the load after a plan save).
    const result = aggregateRecipePortionsNutrition([
      {...readyPortion, calories: 0},
    ]);
    expect(result.status).toBe('ready');
    expect(result.calories).toBe(0);
    expect(result.satietyScore).toBeNull();
  });
});

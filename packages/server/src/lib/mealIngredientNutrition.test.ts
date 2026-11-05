import {
  anthropicCreateSpy,
  nockAnthropicMessage,
} from '../test/mockNockAnthropic.js';

import {estimateMealIngredientNutrition} from './mealIngredientNutrition.js';

describe('estimateMealIngredientNutrition (#362)', () => {
  test('estimates via the recipe AI lookup and stores per-serving macros', async () => {
    nockAnthropicMessage(
      JSON.stringify({
        calories: 200,
        proteinG: 4,
        carbsG: 44,
        fatG: 1,
        fiberG: 1,
        sugarG: 0,
        sodiumMg: 5,
        preparedWeightG: 300,
        disclaimer: 'Estimated.',
      }),
    );

    const result = await estimateMealIngredientNutrition({
      name: 'Rice',
      quantity: 2,
      unit: 'cups',
      servings: 2,
    });

    expect(result).toMatchObject({
      calories: 200,
      proteinG: 4,
      carbsG: 44,
      fatG: 1,
      fiberG: 1,
      sugarG: 0,
      sodiumMg: 5,
      preparedWeightG: 300,
      nutritionStatus: 'ready',
      nutritionDisclaimer: 'Estimated.',
    });
    expect(result.satietyScore).toBeGreaterThan(0);
    // The lookup is the recipe one: one ingredient line, entry servings.
    const call = anthropicCreateSpy.mock.calls.at(-1) as unknown as [
      {messages: {content: string}[]},
    ];
    expect(call[0].messages[0]?.content).toContain('Rice');
    expect(call[0].messages[0]?.content).toContain('2 servings');
  });

  test('handles an entry without quantity/unit and an estimate with null fiber, sugar, and sodium', async () => {
    nockAnthropicMessage(
      JSON.stringify({
        calories: 200,
        proteinG: 4,
        carbsG: 44,
        fatG: 1,
        fiberG: null,
        sugarG: null,
        sodiumMg: null,
        preparedWeightG: 300,
        disclaimer: 'Estimated.',
      }),
    );

    const result = await estimateMealIngredientNutrition({
      name: 'Rice',
      servings: 2,
    });

    expect(result).toMatchObject({
      calories: 200,
      fiberG: null,
      sugarG: null,
      sodiumMg: null,
      nutritionStatus: 'ready',
    });
    expect(result.satietyScore).toEqual(expect.any(Number));
    // The lookup receives null quantity/unit for an entry that omits them.
    const call = anthropicCreateSpy.mock.calls.at(-1) as unknown as [
      {messages: {content: string}[]},
    ];
    expect(call[0].messages[0]?.content).toContain('Rice');
  });

  test('returns failed nutrition (no throw) when the lookup fails', async () => {
    nockAnthropicMessage('not json');

    const result = await estimateMealIngredientNutrition({
      name: 'Rice',
      quantity: 2,
      unit: 'cups',
      servings: 1,
    });

    expect(result).toEqual({
      calories: null,
      proteinG: null,
      carbsG: null,
      fatG: null,
      fiberG: null,
      sugarG: null,
      sodiumMg: null,
      preparedWeightG: null,
      satietyScore: null,
      nutritionStatus: 'failed',
      nutritionDisclaimer: null,
    });
  });
});

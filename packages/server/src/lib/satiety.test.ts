import {calculateRecipeSatiety, calculateSatiety} from './satiety.js';

describe('calculateSatiety', () => {
  test('scores a boiled potato', () => {
    const potato = {
      calories: 87,
      protein: 1.9,
      fat: 0.1,
      totalCarbs: 20.1,
      fiber: 1.8,
      sugar: 0.9,
      sodium: 4,
      weight: 100,
    };

    const result = calculateSatiety(potato);
    expect(result.score).toBeGreaterThan(50);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.proteinScore).toBeGreaterThanOrEqual(0);
    expect(result.energyDensityScore).toBeGreaterThan(50);
    expect(result.fiberScore).toBeGreaterThan(0);
    expect(result.hedonicPenalty).toBe(0);
  });

  test('rejects non-positive calories or weight', () => {
    expect(() =>
      calculateSatiety({
        calories: 0,
        protein: 1,
        fat: 0,
        totalCarbs: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
        weight: 100,
      }),
    ).toThrow('Calories and weight must be positive finite numbers');
  });
});

describe('calculateRecipeSatiety', () => {
  test('scores a complete recipe from ingredient totals', () => {
    const ingredients = [
      {
        calories: 216,
        protein: 18.9,
        fat: 14.4,
        totalCarbs: 1.2,
        fiber: 0,
        sugar: 0.6,
        sodium: 213,
        weight: 150,
      },
      {
        calories: 70,
        protein: 5,
        fat: 0.8,
        totalCarbs: 14,
        fiber: 5,
        sugar: 6,
        sodium: 40,
        weight: 200,
      },
    ];

    const result = calculateRecipeSatiety(ingredients, 330);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);

    const proportional = calculateRecipeSatiety(
      ingredients.map(n => ({
        ...n,
        calories: n.calories / 2,
        protein: n.protein / 2,
        fat: n.fat / 2,
        totalCarbs: n.totalCarbs / 2,
        fiber: n.fiber / 2,
        sugar: n.sugar / 2,
        sodium: n.sodium / 2,
      })),
      165,
    );
    expect(proportional.score).toBe(result.score);
  });

  test('rejects non-positive final weight', () => {
    expect(() =>
      calculateRecipeSatiety(
        [
          {
            calories: 100,
            protein: 1,
            fat: 0,
            totalCarbs: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0,
            weight: 50,
          },
        ],
        0,
      ),
    ).toThrow('Final weight must be a positive number');
  });
});

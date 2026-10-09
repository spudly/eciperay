import {z} from 'zod';

import {
  AiStepTimingResponseSchema,
  MealInputSchema,
  MealPlanInputSchema,
  NutritionGoalsSchema,
} from './mealSchemas.js';

const recipeId = '00000000-0000-4000-8000-000000000001';

describe('mealSchemas', () => {
  test('MealInputSchema accepts valid input', () => {
    expect(
      MealInputSchema.parse({
        title: 'Dinner',
        notes: 'notes',
        recipes: [{recipeId, servings: 2}],
      }),
    ).toMatchObject({title: 'Dinner'});
  });

  test('MealInputSchema rejects empty title', () => {
    expect(() =>
      MealInputSchema.parse({title: '', recipes: [{recipeId}]}),
    ).toThrow(z.ZodError);
  });

  test('MealPlanInputSchema accepts valid plan', () => {
    expect(
      MealPlanInputSchema.parse({
        title: 'Week',
        startsOn: '2026-01-01',
        endsOn: '2026-01-07',
        entries: [{mealId: recipeId}, {recipeId, servings: 2}],
      }),
    ).toMatchObject({title: 'Week'});
  });

  test('MealPlanInputSchema rejects bad dates', () => {
    expect(() =>
      MealPlanInputSchema.parse({
        title: 'Week',
        startsOn: '01/01/2026',
        entries: [{mealId: recipeId}],
      }),
    ).toThrow(z.ZodError);
  });

  test('NutritionGoalsSchema accepts nullable macros', () => {
    expect(
      NutritionGoalsSchema.parse({
        calories: 2000,
        proteinG: null,
        carbsG: null,
        fatG: null,
        satietyScore: 50,
      }),
    ).toEqual({
      calories: 2000,
      proteinG: null,
      carbsG: null,
      fatG: null,
      satietyScore: 50,
    });
  });

  test('AiStepTimingResponseSchema validates timing array', () => {
    expect(
      AiStepTimingResponseSchema.parse([
        {stepNumber: 1, durationMin: 5},
        {stepNumber: 2, durationMin: 0},
      ]),
    ).toHaveLength(2);
  });
});

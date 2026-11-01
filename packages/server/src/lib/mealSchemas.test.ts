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

  test('MealPlanInputSchema rejects impossible calendar dates', () => {
    expect(() =>
      MealPlanInputSchema.parse({
        title: 'Week',
        startsOn: '2026-02-31',
        entries: [{mealId: recipeId}],
      }),
    ).toThrow(z.ZodError);
    expect(() =>
      MealPlanInputSchema.parse({
        title: 'Week',
        endsOn: '2026-04-31',
        entries: [{mealId: recipeId}],
      }),
    ).toThrow(z.ZodError);
  });

  test('MealPlanInputSchema rejects Feb 29 in a non-leap year', () => {
    expect(() =>
      MealPlanInputSchema.parse({
        title: 'Week',
        startsOn: '2026-02-29',
        entries: [{mealId: recipeId}],
      }),
    ).toThrow(z.ZodError);
  });

  test('MealPlanInputSchema accepts a leap day', () => {
    expect(
      MealPlanInputSchema.parse({
        title: 'Week',
        startsOn: '2028-02-29',
        endsOn: '2028-03-01',
        entries: [{mealId: recipeId}],
      }),
    ).toMatchObject({startsOn: '2028-02-29'});
  });

  test('MealPlanInputSchema rejects endsOn before startsOn', () => {
    expect(() =>
      MealPlanInputSchema.parse({
        title: 'Week',
        startsOn: '2026-01-07',
        endsOn: '2026-01-01',
        entries: [{mealId: recipeId}],
      }),
    ).toThrow(z.ZodError);
  });

  test('MealPlanInputSchema accepts a same-day range', () => {
    expect(
      MealPlanInputSchema.parse({
        title: 'Week',
        startsOn: '2026-01-01',
        endsOn: '2026-01-01',
        entries: [{mealId: recipeId}],
      }),
    ).toMatchObject({endsOn: '2026-01-01'});
  });

  test('MealPlanInputSchema accepts null and absent dates', () => {
    expect(
      MealPlanInputSchema.parse({
        title: 'Week',
        startsOn: null,
        endsOn: null,
        entries: [{mealId: recipeId}],
      }),
    ).toMatchObject({startsOn: null, endsOn: null});
    expect(
      MealPlanInputSchema.parse({title: 'Week', entries: [{mealId: recipeId}]}),
    ).toMatchObject({title: 'Week'});
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

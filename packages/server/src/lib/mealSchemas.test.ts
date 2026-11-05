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

  test('MealInputSchema accepts a direct-only meal (#362)', () => {
    const parsed = MealInputSchema.parse({
      title: 'Snack',
      ingredients: [{name: 'Rice', quantity: 2, unit: 'cups', servings: 2}],
    });
    expect(parsed.recipes).toEqual([]);
    expect(parsed.ingredients).toEqual([
      {name: 'Rice', quantity: 2, unit: 'cups', servings: 2},
    ]);
  });

  test('MealInputSchema accepts a mixed meal (#362)', () => {
    const parsed = MealInputSchema.parse({
      title: 'Dinner',
      recipes: [{recipeId}],
      ingredients: [{name: 'Protein shake'}],
    });
    expect(parsed.recipes).toHaveLength(1);
    expect(parsed.ingredients).toHaveLength(1);
  });

  test('MealInputSchema rejects a meal with no members of either kind (#362)', () => {
    expect(() =>
      MealInputSchema.parse({title: 'Empty', recipes: [], ingredients: []}),
    ).toThrow(z.ZodError);
  });

  test('MealInputSchema keeps omitted ingredients distinct from an explicit empty list (#432)', () => {
    // A PUT that omits `ingredients` (e.g. the MCP read-merge-PUT) must
    // not be read as "clear all direct ingredients": the omission stays
    // visible in the parsed value so replaceMeal can preserve the
    // stored rows, and the at-least-one-member rule defers to the save
    // layer, which validates it against those stored rows.
    const omitted = MealInputSchema.parse({
      title: 'Dinner',
      recipes: [{recipeId}],
    });
    expect(omitted.ingredients).toBeUndefined();
    const explicit = MealInputSchema.parse({
      title: 'Dinner',
      recipes: [{recipeId}],
      ingredients: [],
    });
    expect(explicit.ingredients).toEqual([]);
    // With no recipes either, an omitted list still parses — the save
    // layer rejects it unless stored ingredients remain.
    expect(MealInputSchema.parse({title: 'Empty'}).ingredients).toBeUndefined();
  });

  test('MealInputSchema caps direct ingredients at 50 (#432)', () => {
    const fifty = Array.from({length: 50}, (_, i) => ({
      name: `Item ${String(i)}`,
    }));
    expect(
      MealInputSchema.parse({title: 'Big', ingredients: fifty}).ingredients,
    ).toHaveLength(50);
    expect(() =>
      MealInputSchema.parse({
        title: 'Huge',
        ingredients: [...fifty, {name: 'One too many'}],
      }),
    ).toThrow(z.ZodError);
  });

  test('MealInputSchema rejects invalid direct ingredients (#362)', () => {
    expect(() =>
      MealInputSchema.parse({title: 'X', ingredients: [{name: ''}]}),
    ).toThrow(z.ZodError);
    expect(() =>
      MealInputSchema.parse({
        title: 'X',
        ingredients: [{name: 'Rice', quantity: 0}],
      }),
    ).toThrow(z.ZodError);
    expect(() =>
      MealInputSchema.parse({
        title: 'X',
        ingredients: [{name: 'Rice', servings: 0}],
      }),
    ).toThrow(z.ZodError);
    // Clients never send nutrition for a direct entry — it is estimated
    // server-side — but unknown keys are stripped, not stored.
    const parsed = MealInputSchema.parse({
      title: 'X',
      ingredients: [{name: 'Rice', calories: 999}],
    } as unknown as Parameters<typeof MealInputSchema.parse>[0]);
    expect(parsed.ingredients?.[0]).toEqual({name: 'Rice'});
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

  test('MealPlanInputSchema rejects year zero, which Postgres has no date for', () => {
    expect(() =>
      MealPlanInputSchema.parse({
        title: 'Week',
        startsOn: '0000-01-01',
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

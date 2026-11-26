import type {
  MealDetail,
  MealPlanDetail,
  MealPlanEntry,
  MealPlanInput,
} from '@eciperay/types';

import {
  applyMealPlanEdit,
  buildMealInputWithAddedRecipe,
  buildMealInputWithMemberServings,
  buildMealInputWithoutMember,
  buildMealPlanInputFromDetail,
  isConflictError,
  mealPlanEntryClientKey,
  saveMealEdit,
  saveMealPlanEdit,
} from './mealPlanInlineEdits.js';

const recipeEntry = (
  id: string,
  overrides: Partial<Extract<MealPlanEntry, {type: 'recipe'}>> = {},
): MealPlanEntry => ({
  type: 'recipe',
  id,
  recipeId: `r-${id}`,
  sortOrder: 0,
  quantity: 1,
  day: '2026-10-19',
  servingsToCook: 4,
  servingsToEat: 4,
  title: `Recipe ${id}`,
  imageUrl: null,
  recipeServings: 4,
  accessLost: false,
  nutrition: null,
  satietyScore: null,
  nutritionStatus: null,
  calories: null,
  proteinG: null,
  carbsG: null,
  fatG: null,
  ...overrides,
});

const mealEntry = (
  id: string,
  overrides: Partial<Extract<MealPlanEntry, {type: 'meal'}>> = {},
): MealPlanEntry => ({
  type: 'meal',
  id,
  mealId: `m-${id}`,
  sortOrder: 0,
  quantity: 1,
  day: '2026-10-19',
  title: `Meal ${id}`,
  memberCount: 2,
  recipeCount: 2,
  nutrition: null,
  ...overrides,
});

const plan = (entries: MealPlanEntry[]): MealPlanDetail => ({
  id: 'plan-1',
  userId: 'user-1',
  title: 'This week',
  notes: 'notes',
  startsOn: '2026-10-19',
  endsOn: '2026-10-25',
  entryCount: entries.length,
  nutrition: null,
  goalProgress: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-02T00:00:00.000Z',
  entries,
});

describe('mealPlanEntryClientKey', () => {
  test('keys by kind, target id, and day — never the server entry id', () => {
    const a = recipeEntry('server-id-1');
    const b = recipeEntry('server-id-2');
    // Same recipe on the same day after a save churned the ids:
    // the client key is stable.
    expect(mealPlanEntryClientKey(a)).toBe(mealPlanEntryClientKey(b));
    expect(mealPlanEntryClientKey(a)).toBe('recipe:r-server-id-1@2026-10-19');
    expect(mealPlanEntryClientKey(mealEntry('x'))).toBe(
      'meal:m-x@2026-10-19',
    );
    expect(
      mealPlanEntryClientKey(recipeEntry('server-id-1', {day: null})),
    ).toBe('recipe:r-server-id-1@');
  });
});

describe('buildMealPlanInputFromDetail', () => {
  test('round-trips order, day, quantity, and servings; carries expectedUpdatedAt', () => {
    const input = buildMealPlanInputFromDetail(
      plan([
        mealEntry('a', {quantity: 2}),
        recipeEntry('b', {day: '2026-10-20', servingsToCook: 6, servingsToEat: 3}),
      ]),
    );
    expect(input).toEqual({
      title: 'This week',
      notes: 'notes',
      startsOn: '2026-10-19',
      endsOn: '2026-10-25',
      expectedUpdatedAt: '2026-10-02T00:00:00.000Z',
      entries: [
        {mealId: 'm-a', quantity: 2, day: '2026-10-19'},
        {
          recipeId: 'r-b',
          quantity: 1,
          servingsToCook: 6,
          servingsToEat: 3,
          day: '2026-10-20',
        },
      ],
    } satisfies MealPlanInput);
  });
});

describe('applyMealPlanEdit', () => {
  test('delete removes only the keyed entry', () => {
    const base = plan([mealEntry('a'), recipeEntry('b')]);
    const edited = applyMealPlanEdit(base, {
      type: 'delete',
      clientKey: mealPlanEntryClientKey(base.entries[0]!),
    });
    expect(edited.entries.map(e => e.id)).toEqual(['b']);
    expect(base.entries).toHaveLength(2);
  });

  test('servings and quantity edits land on the keyed entry only', () => {
    const base = plan([recipeEntry('a'), recipeEntry('b')]);
    const edited = applyMealPlanEdit(base, {
      type: 'setRecipeServings',
      clientKey: mealPlanEntryClientKey(base.entries[1]!),
      servingsToCook: 8,
      servingsToEat: 2,
    });
    const second = edited.entries[1]!;
    expect(second.type).toBe('recipe');
    if (second.type === 'recipe') {
      expect(second.servingsToCook).toBe(8);
      expect(second.servingsToEat).toBe(2);
    }
    const quantified = applyMealPlanEdit(base, {
      type: 'setQuantity',
      clientKey: mealPlanEntryClientKey(base.entries[0]!),
      quantity: 3,
    });
    expect(quantified.entries[0]!.quantity).toBe(3);
    expect(quantified.entries[1]!.quantity).toBe(1);
  });

  test('add appends in plan order; moveToDay reassigns the day', () => {
    const base = plan([recipeEntry('a')]);
    const added = applyMealPlanEdit(base, {
      type: 'add',
      entry: mealEntry('new', {day: '2026-10-21'}),
    });
    expect(added.entries.map(e => e.id)).toEqual(['a', 'new']);
    const moved = applyMealPlanEdit(added, {
      type: 'moveToDay',
      clientKey: mealPlanEntryClientKey(added.entries[0]!),
      day: '2026-10-22',
    });
    expect(moved.entries[0]!.day).toBe('2026-10-22');
  });
});

describe('saveMealPlanEdit 409 rebase', () => {
  test('on 409 it refetches, rebases the single edit by client key, and PUTs once more', async () => {
    const base = plan([recipeEntry('a'), recipeEntry('b')]);
    // The refetched plan has churned server ids and a newer
    // updatedAt — the edit must still find recipe r-b by key.
    const fresh = plan([
      recipeEntry('a2', {recipeId: 'r-a'}),
      recipeEntry('b2', {recipeId: 'r-b'}),
    ]);
    fresh.updatedAt = '2026-10-03T00:00:00.000Z';
    const puts: MealPlanInput[] = [];
    let calls = 0;
    const saved = await saveMealPlanEdit({
      plan: base,
      edit: {
        type: 'setRecipeServings',
        clientKey: 'recipe:r-b@2026-10-19',
        servingsToCook: 9,
        servingsToEat: 9,
      },
      put: async (_id, input) => {
        calls += 1;
        puts.push(input);
        if (calls === 1) {
          throw Object.assign(new Error('conflict'), {status: 409});
        }
        return fresh;
      },
      refetch: async () => fresh,
    });
    expect(saved).toBe(fresh);
    expect(puts).toHaveLength(2);
    expect(puts[1]!.expectedUpdatedAt).toBe('2026-10-03T00:00:00.000Z');
    expect(puts[1]!.entries[1]).toMatchObject({
      recipeId: 'r-b',
      servingsToCook: 9,
      servingsToEat: 9,
    });
    expect(puts[1]!.entries[0]).toMatchObject({recipeId: 'r-a', servingsToCook: 4});
  });

  test('a non-409 error propagates without a refetch', async () => {
    let refetched = false;
    await expect(
      saveMealPlanEdit({
        plan: plan([recipeEntry('a')]),
        edit: {type: 'delete', clientKey: 'recipe:r-a@2026-10-19'},
        put: async () => {
          throw Object.assign(new Error('boom'), {status: 500});
        },
        refetch: async () => {
          refetched = true;
          return plan([]);
        },
      }),
    ).rejects.toThrow('boom');
    expect(refetched).toBe(false);
  });
});

describe('isConflictError', () => {
  test('matches only status 409', () => {
    expect(isConflictError(Object.assign(new Error('x'), {status: 409}))).toBe(true);
    expect(isConflictError(Object.assign(new Error('x'), {status: 404}))).toBe(false);
    expect(isConflictError(new Error('x'))).toBe(false);
    expect(isConflictError(null)).toBe(false);
  });
});

const meal = (): MealDetail => ({
  id: 'meal-1',
  userId: 'user-1',
  title: 'Sunday Dinner',
  notes: null,
  memberCount: 2,
  recipeCount: 1,
  nutrition: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-02T00:00:00.000Z',
  members: [
    {
      recipeId: 'r-1',
      sortOrder: 0,
      servingsToCook: 4,
      servingsToEat: 4,
      title: 'Roast',
      imageUrl: null,
      recipeServings: 4,
      accessLost: false,
      satietyScore: null,
      nutritionStatus: null,
      calories: null,
      proteinG: null,
      carbsG: null,
      fatG: null,
    },
  ],
  ingredients: [
    {
      name: 'Salt',
      quantity: 1,
      unit: 'tsp',
      sortOrder: 1,
      servingsToCook: 4,
      servingsToEat: 4,
      fiberG: null,
      sugarG: null,
      sodiumMg: null,
      preparedWeightG: null,
      satietyScore: null,
      nutritionStatus: null,
      calories: null,
      proteinG: null,
      carbsG: null,
      fatG: null,
    },
  ],
});

describe('meal-content input builders', () => {
  test('member servings edit changes only that member; ingredients ride along', () => {
    const input = buildMealInputWithMemberServings(meal(), 'r-1', {
      servingsToCook: 6,
      servingsToEat: 2,
    });
    expect(input.expectedUpdatedAt).toBe('2026-10-02T00:00:00.000Z');
    expect(input.recipes).toEqual([
      {recipeId: 'r-1', servingsToCook: 6, servingsToEat: 2},
    ]);
    expect(input.ingredients).toEqual([
      {name: 'Salt', quantity: 1, unit: 'tsp', servingsToCook: 4, servingsToEat: 4},
    ]);
  });

  test('member delete and add-recipe build whole-object inputs', () => {
    expect(buildMealInputWithoutMember(meal(), 'r-1').recipes).toEqual([]);
    const added = buildMealInputWithAddedRecipe(meal(), 'r-2');
    expect(added.recipes.map(r => r.recipeId)).toEqual(['r-1', 'r-2']);
    // Adding an existing member is a no-op (no duplicates).
    expect(buildMealInputWithAddedRecipe(meal(), 'r-1').recipes).toHaveLength(1);
  });

  test('saveMealEdit rebases on 409 through the same builder', async () => {
    const fresh = meal();
    fresh.updatedAt = '2026-10-03T00:00:00.000Z';
    let calls = 0;
    const saved = await saveMealEdit({
      meal: meal(),
      buildInput: m => buildMealInputWithoutMember(m, 'r-1'),
      put: async (_id, input) => {
        calls += 1;
        if (calls === 1) {
          throw Object.assign(new Error('conflict'), {status: 409});
        }
        expect(input.expectedUpdatedAt).toBe('2026-10-03T00:00:00.000Z');
        return fresh;
      },
      refetch: async () => fresh,
    });
    expect(saved).toBe(fresh);
    expect(calls).toBe(2);
  });
});

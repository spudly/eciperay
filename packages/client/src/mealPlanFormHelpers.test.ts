import type {Meal, MealPlanDetail} from '@eciperay/types';

import {
  buildMealPlanFormEntryOptions,
  mealPlanEntryToggleResult,
  mealPlanFormDraftFromDetail,
} from './mealPlanFormHelpers.js';
import {mealPlanEntryKey} from './mealUiHelpers.js';

const meal = (id: string, title: string): Meal => ({
  id,
  userId: 'u1',
  title,
  notes: null,
  memberCount: 1,
  nutrition: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
});

describe('mealPlanFormHelpers', () => {
  test('uses empty endsOn when plan endsOn is null', () => {
    const plan: MealPlanDetail = {
      id: 'p1',
      userId: 'u1',
      title: 'Week',
      notes: null,
      startsOn: null,
      endsOn: null,
      entryCount: 0,
      nutrition: null,
      goalProgress: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      entries: [],
    };
    expect(mealPlanFormDraftFromDetail(plan).endsOn).toBe('');
  });

  test('builds draft from plan detail', () => {
    const mealKey = mealPlanEntryKey('meal', 'm1');
    const recipeKey = mealPlanEntryKey('recipe', 'r1');
    const plan: MealPlanDetail = {
      id: 'p1',
      userId: 'u1',
      title: 'Week',
      notes: 'notes',
      startsOn: '2026-01-01',
      endsOn: '2026-01-07',
      entryCount: 2,
      nutrition: null,
      goalProgress: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      entries: [
        {
          type: 'meal',
          id: 'e1',
          mealId: 'm1',
          sortOrder: 0,
          quantity: 2,
          title: 'Dinner',
          memberCount: 1,
          nutrition: null,
        },
        {
          type: 'recipe',
          id: 'e2',
          recipeId: 'r1',
          sortOrder: 1,
          quantity: 1,
          servings: 3,
          title: 'Salad',
          imageUrl: null,
          recipeServings: 4,
          accessLost: false,
          nutrition: null,
          satietyScore: null,
          nutritionStatus: null,
          calories: null,
          proteinG: null,
        },
      ],
    };

    expect(mealPlanFormDraftFromDetail(plan)).toEqual({
      title: 'Week',
      notes: 'notes',
      startsOn: '2026-01-01',
      endsOn: '2026-01-07',
      selectedKeys: [mealKey, recipeKey],
      quantityByKey: {[mealKey]: 2, [recipeKey]: 1},
      servingsByRecipeId: {r1: 3},
    });
  });

  test('builds entry options from meals and recipes', () => {
    expect(
      buildMealPlanFormEntryOptions(
        [meal('m1', 'Dinner')],
        [{id: 'r1', title: 'Salad', servings: 4}],
      ),
    ).toEqual([
      {kind: 'meal', id: 'm1', title: 'Dinner'},
      {kind: 'recipe', id: 'r1', title: 'Salad', servings: 4},
    ]);
  });

  test('toggles entries and default quantities', () => {
    const key = mealPlanEntryKey('recipe', 'r1');
    const added = mealPlanEntryToggleResult({
      key,
      previous: [],
      quantityByKey: {},
      servingsByRecipeId: {},
      recipes: [{id: 'r1', title: 'Salad', servings: 4}],
    });
    expect(added.selectedKeys).toEqual([key]);
    expect(added.quantityByKey[key]).toBe(1);
    expect(added.servingsByRecipeId['r1']).toBe(4);

    const removed = mealPlanEntryToggleResult({
      key,
      previous: [key],
      quantityByKey: {[key]: 2},
      servingsByRecipeId: {r1: 2},
      recipes: [{id: 'r1', title: 'Salad', servings: 4}],
    });
    expect(removed.selectedKeys).toEqual([]);
    expect(removed.quantityByKey[key]).toBe(2);
  });

  test('meal entry toggle does not set servings', () => {
    const mealKey = mealPlanEntryKey('meal', 'm1');
    const added = mealPlanEntryToggleResult({
      key: mealKey,
      previous: [],
      quantityByKey: {},
      servingsByRecipeId: {},
      recipes: [{id: 'r1', title: 'Salad', servings: 4}],
    });
    expect(added.servingsByRecipeId).toEqual({});
  });

  test('recipe toggle ignores unknown recipe id', () => {
    const key = mealPlanEntryKey('recipe', 'missing');
    const added = mealPlanEntryToggleResult({
      key,
      previous: [],
      quantityByKey: {},
      servingsByRecipeId: {},
      recipes: [{id: 'r1', title: 'Salad', servings: 4}],
    });
    expect(added.servingsByRecipeId).toEqual({});
  });
});

import {act, renderHook} from '@testing-library/react';
import type {Meal, MealPlanDetail} from '@eciperay/types';

import {mealPlanEntryKey} from './mealUiHelpers.js';
import {useMealPlanEditForm} from './useMealPlanEditForm.js';

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

describe('useMealPlanEditForm', () => {
  test('builds entry options and input from toggles', () => {
    const recipeKey = mealPlanEntryKey('recipe', 'r1');
    const {result} = renderHook(() =>
      useMealPlanEditForm({
        plan: null,
        meals: [meal('m1', 'Dinner')],
        recipes: [{id: 'r1', title: 'Salad', servings: 4}],
      }),
    );

    expect(result.current.entryOptions).toHaveLength(2);
    expect(result.current.entryOptions[0]?.kind).toBe('meal');

    act(() => {
      result.current.handleToggleEntry(recipeKey);
    });

    expect(result.current.selectedKeys).toEqual([recipeKey]);
    expect(result.current.buildInput()).toEqual({
      title: '',
      notes: null,
      startsOn: null,
      endsOn: null,
      entries: [{recipeId: 'r1', quantity: 1, servings: 4}],
    });
  });

  test('hydrates from existing plan', () => {
    const plan: MealPlanDetail = {
      id: 'p1',
      userId: 'u1',
      title: 'Week',
      notes: 'notes',
      startsOn: '2026-01-01',
      endsOn: '2026-01-07',
      entryCount: 1,
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
      ],
    };

    const {result} = renderHook(() =>
      useMealPlanEditForm({plan, meals: [meal('m1', 'Dinner')], recipes: []}),
    );

    expect(result.current.title).toBe('Week');
    expect(result.current.buildInput().entries).toEqual([
      {mealId: 'm1', quantity: 2},
    ]);
  });
});

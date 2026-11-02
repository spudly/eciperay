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
      result.current.handleSelectEntry(recipeKey);
    });

    expect(result.current.selectedKeys).toEqual([recipeKey]);
    expect(result.current.selectedEntries).toEqual([
      {kind: 'recipe', id: 'r1', title: 'Salad', servings: 4},
    ]);
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
    // The selected entry's view-model comes from the plan detail itself,
    // not from the meals/recipes the form was handed.
    expect(result.current.selectedEntries).toEqual([
      {kind: 'meal', id: 'm1', title: 'Dinner'},
    ]);
  });

  test('select never toggles off, remove takes a selection out', () => {
    const recipeKey = mealPlanEntryKey('recipe', 'r1');
    const {result} = renderHook(() =>
      useMealPlanEditForm({
        plan: null,
        meals: [],
        recipes: [{id: 'r1', title: 'Salad', servings: 4}],
      }),
    );

    act(() => {
      result.current.handleSelectEntry(recipeKey);
    });
    act(() => {
      result.current.handleSelectEntry(recipeKey);
    });
    expect(result.current.selectedKeys).toEqual([recipeKey]);

    act(() => {
      result.current.handleRemoveEntry(recipeKey);
    });
    expect(result.current.selectedKeys).toEqual([]);
    expect(result.current.selectedEntries).toEqual([]);
    expect(result.current.buildInput().entries).toEqual([]);
  });

  test('a selected entry survives a later search that no longer returns it', () => {
    const recipeKey = mealPlanEntryKey('recipe', 'r1');
    const {result, rerender} = renderHook(
      ({recipes}: {recipes: {id: string; title: string; servings: number}[]}) =>
        useMealPlanEditForm({plan: null, meals: [], recipes}),
      {initialProps: {recipes: [{id: 'r1', title: 'Salad', servings: 4}]}},
    );

    act(() => {
      result.current.handleSelectEntry(recipeKey);
    });
    // The next search returns a different recipe; r1 is in no result set,
    // but its selected view-model (and stepper servings) must remain.
    rerender({recipes: [{id: 'r2', title: 'Soup', servings: 2}]});
    expect(result.current.selectedEntries).toEqual([
      {kind: 'recipe', id: 'r1', title: 'Salad', servings: 4},
    ]);
    expect(result.current.buildInput().entries).toEqual([
      {recipeId: 'r1', quantity: 1, servings: 4},
    ]);
  });

  test('search text filters the meal half of the entry options', () => {
    const {result} = renderHook(() =>
      useMealPlanEditForm({
        plan: null,
        meals: [meal('m1', 'Dinner'), meal('m2', 'Lunch box')],
        recipes: [{id: 'r1', title: 'Salad', servings: 4}],
        searchText: 'din',
      }),
    );
    expect(result.current.entryOptions).toEqual([
      {kind: 'meal', id: 'm1', title: 'Dinner'},
      {kind: 'recipe', id: 'r1', title: 'Salad', servings: 4},
    ]);
  });
});

import {act, renderHook} from '@testing-library/react';
import type {MealPlanDetail} from '@eciperay/types';

import {mealPlanEntryKey} from './mealUiHelpers.js';
import {useMealPlanEditFormFields} from './useMealPlanEditFormFields.js';

describe('useMealPlanEditFormFields', () => {
  test('starts empty and hydrates from plan', () => {
    const mealKey = mealPlanEntryKey('meal', 'm1');
    const plan: MealPlanDetail = {
      id: 'p1',
      userId: 'u1',
      title: 'Week',
      notes: null,
      startsOn: '2026-01-01',
      endsOn: null,
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
          quantity: 1,
          title: 'Dinner',
          memberCount: 1,
          nutrition: null,
        },
      ],
    };

    const {result, rerender} = renderHook(
      ({currentPlan}: {currentPlan?: MealPlanDetail | null}) =>
        useMealPlanEditFormFields(currentPlan),
      {initialProps: {currentPlan: undefined as MealPlanDetail | undefined}},
    );

    expect(result.current.title).toBe('');

    rerender({currentPlan: plan});
    expect(result.current.title).toBe('Week');
    expect(result.current.selectedKeys).toEqual([mealKey]);

    act(() => {
      result.current.setNotes('Updated');
    });
    expect(result.current.notes).toBe('Updated');
  });
});

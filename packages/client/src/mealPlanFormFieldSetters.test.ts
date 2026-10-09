import React from 'react';
import {act, renderHook} from '@testing-library/react';

import {createMealPlanFormFieldSetters} from './mealPlanFormFieldSetters.js';
import type {MealPlanFormDraft} from './mealPlanFormHelpers.js';

const emptyDraft = (): MealPlanFormDraft => ({
  title: '',
  notes: '',
  startsOn: '',
  endsOn: '',
  selectedKeys: [],
  quantityByKey: {},
  servingsByRecipeId: {},
});

describe('createMealPlanFormFieldSetters', () => {
  test('updates draft fields', () => {
    let draft = emptyDraft();
    const setDraft = (
      value: MealPlanFormDraft | ((c: MealPlanFormDraft) => MealPlanFormDraft),
    ) => {
      draft = typeof value === 'function' ? value(draft) : value;
    };
    const setters = createMealPlanFormFieldSetters(setDraft);

    setters.setTitle('Week');
    setters.setNotes('notes');
    setters.setStartsOn('2026-01-01');
    setters.setEndsOn('2026-01-07');
    setters.setSelectedKeys(['meal:m1']);
    setters.setQuantityByKey({'meal:m1': 2});
    setters.setServingsByRecipeId(current => ({...current, r1: 3}));

    expect(draft).toEqual({
      title: 'Week',
      notes: 'notes',
      startsOn: '2026-01-01',
      endsOn: '2026-01-07',
      selectedKeys: ['meal:m1'],
      quantityByKey: {'meal:m1': 2},
      servingsByRecipeId: {r1: 3},
    });
  });

  test('works with renderHook state', () => {
    const {result} = renderHook(() => {
      const [draft, setDraft] = React.useState(emptyDraft());
      return {...draft, ...createMealPlanFormFieldSetters(setDraft)};
    });

    act(() => {
      result.current.setTitle('Plan');
    });
    expect(result.current.title).toBe('Plan');
  });
});

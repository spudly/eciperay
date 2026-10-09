import type {MealPlanDetail} from '@eciperay/types';
import {useEffect, useState} from 'react';

import {createMealPlanFormFieldSetters} from './mealPlanFormFieldSetters.js';
import {
  mealPlanFormDraftFromDetail,
  type MealPlanFormDraft,
} from './mealPlanFormHelpers.js';

const emptyDraft = (): MealPlanFormDraft => ({
  title: '',
  notes: '',
  startsOn: '',
  endsOn: '',
  selectedKeys: [],
  quantityByKey: {},
  servingsByRecipeId: {},
});

export const useMealPlanEditFormFields = (plan?: MealPlanDetail | null) => {
  const [draft, setDraft] = useState(emptyDraft);

  useEffect(() => {
    if (!plan) {
      return;
    }
    setDraft(mealPlanFormDraftFromDetail(plan));
  }, [plan]);

  return {...draft, ...createMealPlanFormFieldSetters(setDraft)};
};

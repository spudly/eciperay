import type {Dispatch, SetStateAction} from 'react';

import type {MealPlanFormDraft} from './mealPlanFormHelpers.js';

type RecordFieldUpdater = (
  value:
    | Record<string, number>
    | ((current: Record<string, number>) => Record<string, number>),
) => void;

const patchMealPlanDraft = (
  setDraft: Dispatch<SetStateAction<MealPlanFormDraft>>,
  patch: Partial<MealPlanFormDraft>,
) => {
  setDraft(current => ({...current, ...patch}));
};

const createRecordFieldUpdater = (
  setDraft: Dispatch<SetStateAction<MealPlanFormDraft>>,
  field: 'quantityByKey' | 'servingsByRecipeId',
): RecordFieldUpdater => {
  return value => {
    setDraft(current => ({
      ...current,
      [field]: typeof value === 'function' ? value(current[field]) : value,
    }));
  };
};

export const createMealPlanFormFieldSetters = (
  setDraft: Dispatch<SetStateAction<MealPlanFormDraft>>,
) => {
  const setStringField =
    (field: 'title' | 'notes' | 'startsOn' | 'endsOn') => (value: string) => {
      patchMealPlanDraft(setDraft, {[field]: value});
    };

  return {
    setTitle: setStringField('title'),
    setNotes: setStringField('notes'),
    setStartsOn: setStringField('startsOn'),
    setEndsOn: setStringField('endsOn'),
    setSelectedKeys: (selectedKeys: string[]) => {
      patchMealPlanDraft(setDraft, {selectedKeys});
    },
    setQuantityByKey: createRecordFieldUpdater(setDraft, 'quantityByKey'),
    setServingsByRecipeId: createRecordFieldUpdater(
      setDraft,
      'servingsByRecipeId',
    ),
  };
};

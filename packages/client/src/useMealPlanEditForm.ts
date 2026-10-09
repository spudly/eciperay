import type {Meal, MealPlanDetail} from '@eciperay/types';
import {useMemo} from 'react';

import {buildMealPlanInputFromForm} from './mealUiHelpers.js';
import {
  buildMealPlanFormEntryOptions,
  mealPlanEntryToggleResult,
  type MealPlanEditRecipeOption,
} from './mealPlanFormHelpers.js';
import {useMealPlanEditFormFields} from './useMealPlanEditFormFields.js';

export {type MealPlanEditRecipeOption} from './mealPlanFormHelpers.js';

const createMealPlanEditFormActions = (
  fields: ReturnType<typeof useMealPlanEditFormFields>,
  recipes: MealPlanEditRecipeOption[],
) => ({
  handleToggleEntry: (key: string) => {
    const next = mealPlanEntryToggleResult({
      key,
      previous: fields.selectedKeys,
      quantityByKey: fields.quantityByKey,
      servingsByRecipeId: fields.servingsByRecipeId,
      recipes,
    });
    fields.setSelectedKeys(next.selectedKeys);
    fields.setQuantityByKey(next.quantityByKey);
    fields.setServingsByRecipeId(next.servingsByRecipeId);
  },
  buildInput: () =>
    buildMealPlanInputFromForm({
      title: fields.title,
      notes: fields.notes,
      startsOn: fields.startsOn,
      endsOn: fields.endsOn,
      selectedKeys: fields.selectedKeys,
      quantityByKey: fields.quantityByKey,
      servingsByRecipeId: fields.servingsByRecipeId,
    }),
});

export const useMealPlanEditForm = (args: {
  plan?: MealPlanDetail | null;
  meals: Meal[];
  recipes: MealPlanEditRecipeOption[];
}) => {
  const fields = useMealPlanEditFormFields(args.plan);
  const entryOptions = useMemo(
    () => buildMealPlanFormEntryOptions(args.meals, args.recipes),
    [args.meals, args.recipes],
  );
  const actions = createMealPlanEditFormActions(fields, args.recipes);

  return {
    title: fields.title,
    notes: fields.notes,
    startsOn: fields.startsOn,
    endsOn: fields.endsOn,
    selectedKeys: fields.selectedKeys,
    entryOptions,
    quantityByKey: fields.quantityByKey,
    servingsByRecipeId: fields.servingsByRecipeId,
    setTitle: fields.setTitle,
    setNotes: fields.setNotes,
    setStartsOn: fields.setStartsOn,
    setEndsOn: fields.setEndsOn,
    handleToggleEntry: actions.handleToggleEntry,
    setQuantityByKey: fields.setQuantityByKey,
    setServingsByRecipeId: fields.setServingsByRecipeId,
    buildInput: actions.buildInput,
  };
};

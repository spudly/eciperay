import type {Meal, MealPlanDetail} from '@eciperay/types';
import {useEffect, useMemo, useState} from 'react';

import {buildMealPlanInputFromForm, mealPlanEntryKey} from './mealUiHelpers.js';
import {
  buildMealPlanFormEntryOptions,
  buildMealPlanFormEntryOptionsFromDetail,
  mealPlanEntryToggleResult,
  type MealPlanEditRecipeOption,
} from './mealPlanFormHelpers.js';
import type {MealPlanFormEntryOption} from './ui/mealViewComponents.js';
import {useMealPlanEditFormFields} from './useMealPlanEditFormFields.js';

export {type MealPlanEditRecipeOption} from './mealPlanFormHelpers.js';

const createMealPlanEditFormActions = (
  fields: ReturnType<typeof useMealPlanEditFormFields>,
  recipes: MealPlanEditRecipeOption[],
) => {
  const applyToggle = (key: string) => {
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
  };
  return {
    // The autocomplete contract (#359): selecting a result adds it (a
    // result that is already selected is not offered again, and selecting
    // must never toggle a selection off), removing a selected entry takes
    // it out. Both ride the toggle computation in the matching direction.
    handleSelectEntry: (key: string) => {
      if (!fields.selectedKeys.includes(key)) {
        applyToggle(key);
      }
    },
    handleRemoveEntry: (key: string) => {
      if (fields.selectedKeys.includes(key)) {
        applyToggle(key);
      }
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
  };
};

export const useMealPlanEditForm = (args: {
  plan?: MealPlanDetail | null;
  meals: Meal[];
  recipes: MealPlanEditRecipeOption[];
  /**
   * The picker's current search text: meals are matched against it client-side
   * (the meals endpoint has no search), while `recipes` already holds the
   * server-side recipe search results for it.
   */
  searchText?: string;
}) => {
  const fields = useMealPlanEditFormFields(args.plan);
  const entryOptions = useMemo(() => {
    const query = (args.searchText ?? '').trim().toLowerCase();
    const matchingMeals = query
      ? args.meals.filter(meal => meal.title.toLowerCase().includes(query))
      : args.meals;
    return buildMealPlanFormEntryOptions(matchingMeals, args.recipes);
  }, [args.meals, args.recipes, args.searchText]);
  // Every entry option the form has ever seen, accumulated across
  // searches: a selected entry's view-model must survive later searches
  // that no longer return it (#359 — the selected steppers work even
  // when the item is not in the current results).
  const [knownOptions, setKnownOptions] = useState<
    Map<string, MealPlanFormEntryOption>
  >(() => new Map());
  useEffect(() => {
    setKnownOptions(previous => {
      // Bail out when nothing actually changed: hosts rebuild the meals /
      // recipes arrays on every render, so without this the effect would
      // set state on every render and loop forever.
      let changed = false;
      const next = new Map(previous);
      const addAll = (options: MealPlanFormEntryOption[]) => {
        for (const option of options) {
          const key = mealPlanEntryKey(option.kind, option.id);
          const existing = next.get(key);
          if (
            !existing ||
            existing.title !== option.title ||
            (existing.kind === 'recipe' && option.kind === 'recipe'
              ? existing.servings !== option.servings
              : existing.kind !== option.kind)
          ) {
            next.set(key, option);
            changed = true;
          }
        }
      };
      addAll(buildMealPlanFormEntryOptions(args.meals, args.recipes));
      if (args.plan) {
        // The plan being edited is authoritative for its own entries.
        addAll(buildMealPlanFormEntryOptionsFromDetail(args.plan));
      }
      return changed ? next : previous;
    });
  }, [args.meals, args.recipes, args.plan]);
  // Selected entries as their own view-models, in selection order.
  const selectedEntries = useMemo(
    () =>
      fields.selectedKeys
        .map(key => knownOptions.get(key))
        .filter(option => option !== undefined),
    [knownOptions, fields.selectedKeys],
  );
  const actions = createMealPlanEditFormActions(fields, args.recipes);

  return {
    title: fields.title,
    notes: fields.notes,
    startsOn: fields.startsOn,
    endsOn: fields.endsOn,
    selectedKeys: fields.selectedKeys,
    entryOptions,
    selectedEntries,
    quantityByKey: fields.quantityByKey,
    servingsByRecipeId: fields.servingsByRecipeId,
    setTitle: fields.setTitle,
    setNotes: fields.setNotes,
    setStartsOn: fields.setStartsOn,
    setEndsOn: fields.setEndsOn,
    handleSelectEntry: actions.handleSelectEntry,
    handleRemoveEntry: actions.handleRemoveEntry,
    setQuantityByKey: fields.setQuantityByKey,
    setServingsByRecipeId: fields.setServingsByRecipeId,
    buildInput: actions.buildInput,
  };
};

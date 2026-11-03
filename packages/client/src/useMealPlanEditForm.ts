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
    // Word-by-word matching, mirroring the server's recipe search
    // (#385): every word of the search text must appear somewhere in
    // the meal's title, so a multi-word search matches even when the
    // words are not contiguous in the title — the meals half of the
    // picker must not be stricter than the recipe half.
    const queryWords = (args.searchText ?? '')
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 0);
    const matchingMeals =
      queryWords.length > 0
        ? args.meals.filter(meal => {
            const title = meal.title.toLowerCase();
            return queryWords.every(word => title.includes(word));
          })
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
    // Merge the sources with plan precedence BEFORE comparing against
    // the previous state: the plan being edited is authoritative for
    // its own entries, so its options overwrite any list/search option
    // for the same key in the merged set. Comparing only the merged
    // result matters — applying the sources one after another directly
    // to the accumulated map lets a disagreeing search result overwrite
    // a plan entry and the plan pass then restore it, leaving `changed`
    // true even though the final map is identical to the previous one.
    // Both meal-plan hosts rebuild `recipes` on every render, so that
    // spurious change returned a new map on every render, retriggered
    // this effect, and froze the editor.
    const merged = new Map<string, MealPlanFormEntryOption>();
    for (const option of buildMealPlanFormEntryOptions(
      args.meals,
      args.recipes,
    )) {
      merged.set(mealPlanEntryKey(option.kind, option.id), option);
    }
    if (args.plan) {
      for (const option of buildMealPlanFormEntryOptionsFromDetail(args.plan)) {
        merged.set(mealPlanEntryKey(option.kind, option.id), option);
      }
    }
    setKnownOptions(previous => {
      // Bail out when nothing actually changed: hosts rebuild the meals /
      // recipes arrays on every render, so without this the effect would
      // set state on every render and loop forever.
      let changed = false;
      const next = new Map(previous);
      for (const [key, option] of merged) {
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

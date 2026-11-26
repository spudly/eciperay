import {
  buildMealInputWithAddedRecipe,
  buildMealInputWithMemberServings,
  buildMealInputWithoutMember,
  errorMessage,
  mealPlanEntryClientKey,
  queryKeys,
  recipeFormSearchQueryOptions,
  saveMealEdit,
  saveMealPlanEdit,
  useDebouncedValue,
  type MealPlanEntryEdit,
} from '@eciperay/client';
import type {MealPlanDetail, MealPlanEntry} from '@eciperay/types';
import {useMutation, useQueries, useQuery, useQueryClient} from '@tanstack/react-query';
import {useMemo, useState} from 'react';

import {eciperay as api} from '../lib/api.js';

/**
 * Inline editing for the meal plan detail screen (#646,
 * tranche 1): the host half of the DS MealPlanDetailPage's
 * editing props. Every DS intent becomes one edit through the
 * client core (mealPlanInlineEdits): plan edits mutate the
 * in-memory plan, rebuild the whole-plan input, and PUT with
 * expectedUpdatedAt (409 → refetch + rebase the single edit);
 * meal-content edits go through the meals API whole-object PUT
 * the same way. Entries are addressed by CLIENT key
 * (`meal:<id>` / `recipe:<id>` + day) because server entry ids
 * churn on every save — the detail view sets each DS entry's
 * id to that key, so handlers here read it straight off the
 * entry they are handed.
 *
 * The picker state lives here too: an Add intent records what
 * is being picked (a meal for a day, a recipe for a day, or a
 * recipe for a meal) and the screen renders MealPlanEntryPicker
 * for it; picking an option performs the add and closes it.
 */

export type MealPlanPickerRequest =
  | {kind: 'meal'; day: string}
  | {kind: 'recipe'; day: string}
  | {kind: 'recipeToMeal'; mealId: string; mealTitle: string};

export type MealPlanPickerOption = {
  kind: 'meal' | 'recipe';
  id: string;
  title: string;
  servings?: number;
};

type DsEntryLike = {id: string; kind: 'meal' | 'recipe'; targetId: string; title: string};
type DsMemberLike = {id: string; targetId?: string; title: string};

export const useMealPlanInlineEditing = (plan: MealPlanDetail) => {
  const queryClient = useQueryClient();
  const [editingError, setEditingError] = useState<string | null>(null);
  const [focusedDayId, setFocusedDayId] = useState<string | null>(null);
  const [picker, setPicker] = useState<MealPlanPickerRequest | null>(null);
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebouncedValue(searchText);

  const mealEntries = useMemo(
    () => plan.entries.filter(entry => entry.type === 'meal'),
    [plan.entries],
  );

  // Meal details for every meal entry: the member lists the DS
  // page renders (and the whole-object PUTs member edits are
  // built from) come from the meals API, not the plan detail.
  const mealDetailQueries = useQueries({
    queries: mealEntries.map(entry => ({
      queryKey: queryKeys.meal(entry.type === 'meal' ? entry.mealId : entry.id),
      queryFn: () =>
        api.meals.get(entry.type === 'meal' ? entry.mealId : entry.id),
    })),
  });
  const mealDetailsByMealId = useMemo(() => {
    const byId = new Map<string, (typeof mealDetailQueries)[number]['data']>();
    mealEntries.forEach((entry, index) => {
      if (entry.type === 'meal') {
        byId.set(entry.mealId, mealDetailQueries[index]?.data);
      }
    });
    return byId;
  }, [mealEntries, mealDetailQueries]);

  const {data: meals = []} = useQuery({
    queryKey: queryKeys.meals(),
    queryFn: () => api.meals.list(),
    enabled: picker?.kind === 'meal',
  });

  const {data: searchedRecipes = [], isFetching: isSearching} = useQuery({
    ...recipeFormSearchQueryOptions(
      (params, signal) => api.recipes.list(params, signal),
      debouncedSearch,
    ),
    enabled: picker !== null && picker.kind !== 'meal' && debouncedSearch.trim().length > 0,
  });

  const invalidatePlan = (saved?: MealPlanDetail) => {
    if (saved) {
      queryClient.setQueryData(queryKeys.mealPlan(plan.id), saved);
    }
    void queryClient.invalidateQueries({queryKey: queryKeys.mealPlan(plan.id)});
    void queryClient.invalidateQueries({queryKey: queryKeys.mealPlans()});
  };

  const planMutation = useMutation({
    mutationFn: (edit: MealPlanEntryEdit) =>
      saveMealPlanEdit({
        plan,
        edit,
        put: (id, input) => api.mealPlans.put(id, input),
        refetch: id => api.mealPlans.get(id),
      }),
    onSuccess: saved => {
      setEditingError(null);
      invalidatePlan(saved);
    },
    onError: error => {
      setEditingError(errorMessage(error));
      invalidatePlan();
    },
  });

  const mealMutation = useMutation({
    mutationFn: (args: {
      mealId: string;
      buildInput: Parameters<typeof saveMealEdit>[0]['buildInput'];
    }) => {
      const meal = mealDetailsByMealId.get(args.mealId);
      if (!meal) {
        throw new Error('Meal is still loading');
      }
      return saveMealEdit({
        meal,
        buildInput: args.buildInput,
        put: (id, input) => api.meals.put(id, input),
        refetch: id => api.meals.get(id),
      });
    },
    onSuccess: (saved, args) => {
      setEditingError(null);
      queryClient.setQueryData(queryKeys.meal(args.mealId), saved);
      void queryClient.invalidateQueries({queryKey: queryKeys.meals()});
      // Member changes move the plan's nutrition and counts.
      invalidatePlan();
    },
    onError: error => {
      setEditingError(errorMessage(error));
    },
  });

  const runPlanEdit = (edit: MealPlanEntryEdit) => {
    setEditingError(null);
    planMutation.mutate(edit);
  };

  const handlers = {
    onAddMealToDay: (day: {id: string}) => {
      setSearchText('');
      setPicker({kind: 'meal', day: day.id});
    },
    onAddRecipeToDay: (day: {id: string}) => {
      setSearchText('');
      setPicker({kind: 'recipe', day: day.id});
    },
    onAddRecipeToMeal: (entry: DsEntryLike) => {
      setSearchText('');
      setPicker({kind: 'recipeToMeal', mealId: entry.targetId, mealTitle: entry.title});
    },
    onDeleteEntry: (entry: DsEntryLike) => {
      runPlanEdit({type: 'delete', clientKey: entry.id});
    },
    onEntryQuantityChange: (entry: DsEntryLike, quantity: number) => {
      runPlanEdit({type: 'setQuantity', clientKey: entry.id, quantity});
    },
    onEntryServingsChange: (
      entry: DsEntryLike,
      servings: {servingsToCook: number; servingsToEat: number},
    ) => {
      runPlanEdit({type: 'setRecipeServings', clientKey: entry.id, ...servings});
    },
    onDeleteMember: (entry: DsEntryLike, member: DsMemberLike) => {
      if (!member.targetId) {
        return;
      }
      mealMutation.mutate({
        mealId: entry.targetId,
        buildInput: meal => buildMealInputWithoutMember(meal, member.targetId!),
      });
    },
    onMemberServingsChange: (
      entry: DsEntryLike,
      member: DsMemberLike,
      servings: {servingsToCook: number; servingsToEat: number},
    ) => {
      if (!member.targetId) {
        return;
      }
      mealMutation.mutate({
        mealId: entry.targetId,
        buildInput: meal =>
          buildMealInputWithMemberServings(meal, member.targetId!, servings),
      });
    },
    onFocusedDayChange: (dayId: string | null) => {
      setFocusedDayId(dayId);
    },
  };

  const pickerOptions: MealPlanPickerOption[] = useMemo(() => {
    if (!picker) {
      return [];
    }
    if (picker.kind === 'meal') {
      const query = searchText.trim().toLowerCase();
      return meals
        .filter(meal => !query || meal.title.toLowerCase().includes(query))
        .map(meal => ({kind: 'meal' as const, id: meal.id, title: meal.title}));
    }
    return searchedRecipes.map(recipe => ({
      kind: 'recipe' as const,
      id: recipe.id,
      title: recipe.title,
      servings: recipe.servings,
    }));
  }, [picker, meals, searchedRecipes, searchText]);

  const selectPickerOption = (option: MealPlanPickerOption) => {
    if (!picker) {
      return;
    }
    if (picker.kind === 'meal' && option.kind === 'meal') {
      const meal = meals.find(candidate => candidate.id === option.id);
      const entry: MealPlanEntry = {
        type: 'meal',
        id: '',
        mealId: option.id,
        sortOrder: plan.entries.length,
        quantity: 1,
        day: picker.day,
        title: option.title,
        memberCount: meal?.memberCount ?? 0,
        recipeCount: meal?.recipeCount ?? 0,
        nutrition: null,
      };
      runPlanEdit({type: 'add', entry});
    } else if (picker.kind === 'recipe' && option.kind === 'recipe') {
      const servings = option.servings ?? 1;
      const entry: MealPlanEntry = {
        type: 'recipe',
        id: '',
        recipeId: option.id,
        sortOrder: plan.entries.length,
        quantity: 1,
        day: picker.day,
        servingsToCook: servings,
        servingsToEat: servings,
        title: option.title,
        imageUrl: null,
        recipeServings: servings,
        accessLost: false,
        nutrition: null,
        satietyScore: null,
        nutritionStatus: null,
        calories: null,
        proteinG: null,
        carbsG: null,
        fatG: null,
      };
      runPlanEdit({type: 'add', entry});
    } else if (picker.kind === 'recipeToMeal' && option.kind === 'recipe') {
      const servings = option.servings ?? 1;
      mealMutation.mutate({
        mealId: picker.mealId,
        buildInput: meal =>
          buildMealInputWithAddedRecipe(meal, option.id, {
            servingsToCook: servings,
            servingsToEat: servings,
          }),
      });
    }
    setPicker(null);
  };

  return {
    handlers,
    editingError,
    focusedDayId,
    mealDetailsByMealId,
    isSaving: planMutation.isPending || mealMutation.isPending,
    picker,
    closePicker: () => {
      setPicker(null);
    },
    searchText,
    setSearchText,
    isSearching,
    pickerOptions,
    selectPickerOption,
  };
};

export type MealPlanInlineEditing = ReturnType<typeof useMealPlanInlineEditing>;

// Re-exported for the detail view's entry mapping: DS entries
// are keyed by client key, per the plan for #646 tranche 1.
export {mealPlanEntryClientKey};

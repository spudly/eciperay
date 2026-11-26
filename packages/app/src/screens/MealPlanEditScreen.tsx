import {
  errorMessage,
  queryKeys,
  recipeFormSearchQueryOptions,
  useDebouncedValue,
  useMealPlanEditForm,
} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {MealPlanFormPage} from '@spudly/ui';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';

import {ScreenLoadingGate} from '../components/ScreenLoadingGate';
import {api} from '../lib/api';
import type {MealsStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealPlanEdit'>;

export const MealPlanEditScreen = ({route, navigation}: Props) => {
  const planId = route.params.planId ?? '';
  const isEdit = planId.length > 0;
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [searchText] = useState('');
  const debouncedSearch = useDebouncedValue(searchText);

  const {data: plan, isLoading: planLoading} = useQuery({
    queryKey: queryKeys.mealPlan(planId),
    queryFn: () => api.mealPlans.get(planId),
    enabled: isEdit,
  });

  const {data: meals = []} = useQuery({
    queryKey: queryKeys.meals(),
    queryFn: () => api.meals.list(),
  });

  // Server-side recipe search for the picker (#359): the meals half of
  // the entry list is matched against the same text in the form hook
  // (the meals endpoint has no search), and the selected entries are
  // tracked separately in the hook, so no full recipe library is loaded.
  const {data: searchedRecipes = []} = useQuery({
    ...recipeFormSearchQueryOptions(
      (params, signal) => api.recipes.list(params, signal),
      debouncedSearch,
    ),
    enabled: debouncedSearch.trim().length > 0,
  });

  const form = useMealPlanEditForm({
    plan,
    meals,
    recipes: searchedRecipes.map(recipe => ({
      id: recipe.id,
      title: recipe.title,
      servings: recipe.servings,
    })),
    searchText: debouncedSearch,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const input = form.buildInput();
      if (isEdit && planId) {
        return api.mealPlans.put(planId, input);
      }
      return api.mealPlans.create(input);
    },
    onSuccess: saved => {
      void queryClient.invalidateQueries({queryKey: queryKeys.mealPlans()});
      void queryClient.invalidateQueries({
        queryKey: queryKeys.mealPlan(saved.id),
      });
      navigation.replace('MealPlanDetail', {planId: saved.id});
    },
    onError: error => {
      setFormError(errorMessage(error));
    },
  });

  return (
    <ScreenLoadingGate pending={isEdit && planLoading}>
      {/* Details-only form (#646, tranche 1): title, notes, and
          dates. Entries are added and edited on the plan's view
          page now — the form hook's state still carries the
          plan's existing entries into buildInput, so saving
          details preserves them; creating a plan saves it empty
          and lands on the view page to fill it (the save
          mutation's onSuccess already replaces this screen with
          the plan detail). */}
      <MealPlanFormPage
        title={form.title}
        notes={form.notes}
        startsOn={form.startsOn}
        endsOn={form.endsOn}
        isSaving={saveMutation.isPending}
        error={formError}
        onTitleChange={form.setTitle}
        onNotesChange={form.setNotes}
        onStartsOnChange={form.setStartsOn}
        onEndsOnChange={form.setEndsOn}
        onSubmit={() => {
          setFormError(null);
          saveMutation.mutate();
        }}
      />
    </ScreenLoadingGate>
  );
};

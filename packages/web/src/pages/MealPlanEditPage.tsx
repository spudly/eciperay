import {
  errorMessage,
  queryKeys,
  recipeFormSearchQueryOptions,
  useDebouncedValue,
  useMealPlanEditForm,
} from '@eciperay/client';
import {MealPlanFormPage as MealPlanFormPageView} from '@spudly/ui';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import {ScreenLoadingGate} from '../components/ScreenLoadingGate.js';
import {eciperay} from '../lib/api.js';

export const MealPlanEditPage = () => {
  const {planId = ''} = useParams();
  const isEdit = planId.length > 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [searchText] = useState('');
  const debouncedSearch = useDebouncedValue(searchText);

  const {data: plan, isLoading: planLoading} = useQuery({
    queryKey: queryKeys.mealPlan(planId),
    queryFn: () => eciperay.mealPlans.get(planId),
    enabled: isEdit,
  });

  const {data: meals = []} = useQuery({
    queryKey: queryKeys.meals(),
    queryFn: () => eciperay.meals.list(),
  });

  // Server-side recipe search for the picker (#359): the meals half of
  // the entry list is matched against the same text in the form hook
  // (the meals endpoint has no search), and the selected entries are
  // tracked separately in the hook, so no full recipe library is loaded.
  const {data: searchedRecipes = []} = useQuery({
    ...recipeFormSearchQueryOptions(
      (params, signal) => eciperay.recipes.list(params, signal),
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
        return eciperay.mealPlans.put(planId, input);
      }
      return eciperay.mealPlans.create(input);
    },
    onSuccess: async saved => {
      // Write the saved detail into its cache entry before navigating:
      // the detail page renders from this entry, and fire-and-forget
      // invalidation racing the navigation left it showing the pre-edit
      // plan until a reload (#259). The PUT response is the full detail.
      queryClient.setQueryData(queryKeys.mealPlan(saved.id), saved);
      await queryClient.invalidateQueries({queryKey: queryKeys.mealPlans()});
      void navigate(`/meal-plans/${saved.id}`);
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
          and lands on the view page to fill it. */}
      <MealPlanFormPageView
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

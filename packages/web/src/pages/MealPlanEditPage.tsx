import {
  errorMessage,
  mealPlanEntryKey,
  queryKeys,
  recipeFormSearchQueryOptions,
  useDebouncedValue,
  useMealPlanEditForm,
} from '@eciperay/client';
import {MealPlanFormPage as MealPlanFormPageView} from '@spudly/ui/pages';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import {ScreenLoadingGate} from '../components/ScreenLoadingGate.js';
import {eciperay} from '../lib/api.js';

const toEntryOption = (option: {
  kind: 'meal' | 'recipe';
  id: string;
  title: string;
  servings?: number;
}) => ({
  key: mealPlanEntryKey(option.kind, option.id),
  kind: option.kind,
  title: option.title,
  ...(option.kind === 'recipe'
    ? {recipeId: option.id, servings: option.servings}
    : {}),
});

export const MealPlanEditPage = () => {
  const {planId = ''} = useParams();
  const isEdit = planId.length > 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
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
  const {
    data: searchedRecipes = [],
    isFetching: isSearching,
    error: searchError,
  } = useQuery({
    ...recipeFormSearchQueryOptions(
      params => eciperay.recipes.list(params),
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
      <MealPlanFormPageView
        title={form.title}
        notes={form.notes}
        startsOn={form.startsOn}
        endsOn={form.endsOn}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        searchResults={form.entryOptions.map(toEntryOption)}
        isSearching={isSearching || debouncedSearch !== searchText}
        selectedEntries={form.selectedEntries.map(toEntryOption)}
        quantityByKey={form.quantityByKey}
        servingsByRecipeId={form.servingsByRecipeId}
        isSaving={saveMutation.isPending}
        error={
          formError ??
          // Same picker-error surfacing as the meal form (#359): a
          // failed search must not read as "no matches".
          (searchError
            ? `Could not load recipes: ${errorMessage(searchError)}`
            : null)
        }
        onTitleChange={form.setTitle}
        onNotesChange={form.setNotes}
        onStartsOnChange={form.setStartsOn}
        onEndsOnChange={form.setEndsOn}
        onSelectEntry={form.handleSelectEntry}
        onRemoveEntry={form.handleRemoveEntry}
        onQuantityChange={(key, quantity) => {
          // Same minimum-of-1 clamp as the meal form host: the retired
          // adapter enforced it, the DS page's steppers are unbounded,
          // and the server schema rejects 0.
          form.setQuantityByKey(current => ({
            ...current,
            [key]: Math.max(1, quantity),
          }));
        }}
        onRecipeServingsChange={(recipeId, servings) => {
          form.setServingsByRecipeId(current => ({
            ...current,
            [recipeId]: Math.max(1, servings),
          }));
        }}
        onSubmit={() => {
          setFormError(null);
          saveMutation.mutate();
        }}
      />
    </ScreenLoadingGate>
  );
};

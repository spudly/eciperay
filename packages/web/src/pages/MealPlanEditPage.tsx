import {
  errorMessage,
  mealPlanEntryKey,
  queryKeys,
  recipeFormOptionsQueryOptions,
  useMealPlanEditForm,
} from '@eciperay/client';
import {MealPlanFormPage as MealPlanFormPageView} from '@spudly/ui/pages';
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

  const {data: plan, isLoading: planLoading} = useQuery({
    queryKey: queryKeys.mealPlan(planId),
    queryFn: () => eciperay.mealPlans.get(planId),
    enabled: isEdit,
  });

  const {data: meals = []} = useQuery({
    queryKey: queryKeys.meals(),
    queryFn: () => eciperay.meals.list(),
  });

  const {data: recipes = [], isLoading: recipesLoading} = useQuery(
    recipeFormOptionsQueryOptions(params => eciperay.recipes.list(params)),
  );

  const form = useMealPlanEditForm({plan, meals, recipes});

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
    <ScreenLoadingGate pending={isEdit && (planLoading || recipesLoading)}>
      <MealPlanFormPageView
        title={form.title}
        notes={form.notes}
        startsOn={form.startsOn}
        endsOn={form.endsOn}
        selectedKeys={form.selectedKeys}
        entryOptions={form.entryOptions.map(option => ({
          key: mealPlanEntryKey(option.kind, option.id),
          kind: option.kind,
          title: option.title,
          ...(option.kind === 'recipe'
            ? {recipeId: option.id, servings: option.servings}
            : {}),
        }))}
        quantityByKey={form.quantityByKey}
        servingsByRecipeId={form.servingsByRecipeId}
        isSaving={saveMutation.isPending}
        error={formError}
        onTitleChange={form.setTitle}
        onNotesChange={form.setNotes}
        onStartsOnChange={form.setStartsOn}
        onEndsOnChange={form.setEndsOn}
        onToggleEntry={form.handleToggleEntry}
        onQuantityChange={(key, quantity) => {
          form.setQuantityByKey(current => ({...current, [key]: quantity}));
        }}
        onRecipeServingsChange={(recipeId, servings) => {
          form.setServingsByRecipeId(current => ({
            ...current,
            [recipeId]: servings,
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

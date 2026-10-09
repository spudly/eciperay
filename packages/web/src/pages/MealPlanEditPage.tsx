import {errorMessage, queryKeys, useMealPlanEditForm} from '@eciperay/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import {MealPlanFormView} from '../components/meals/MealPlanFormView.js';
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

  const {data: recipes = [], isLoading: recipesLoading} = useQuery({
    queryKey: queryKeys.recipes({sort: 'newest', sortDir: 'desc'}),
    queryFn: () => eciperay.recipes.list({limit: 100}),
  });

  const form = useMealPlanEditForm({plan, meals, recipes});

  const saveMutation = useMutation({
    mutationFn: () => {
      const input = form.buildInput();
      if (isEdit && planId) {
        return eciperay.mealPlans.put(planId, input);
      }
      return eciperay.mealPlans.create(input);
    },
    onSuccess: saved => {
      void queryClient.invalidateQueries({queryKey: queryKeys.mealPlans()});
      void queryClient.invalidateQueries({
        queryKey: queryKeys.mealPlan(saved.id),
      });
      void navigate(`/meal-plans/${saved.id}`);
    },
    onError: error => {
      setFormError(errorMessage(error));
    },
  });

  return (
    <ScreenLoadingGate pending={isEdit && (planLoading || recipesLoading)}>
      <MealPlanFormView
        title={form.title}
        notes={form.notes}
        startsOn={form.startsOn}
        endsOn={form.endsOn}
        selectedKeys={form.selectedKeys}
        entryOptions={form.entryOptions}
        quantityByKey={form.quantityByKey}
        servingsByRecipeId={form.servingsByRecipeId}
        saving={saveMutation.isPending}
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

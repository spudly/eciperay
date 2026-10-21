import {
  errorMessage,
  queryKeys,
  recipeFormOptionsQueryOptions,
  useMealPlanEditForm,
} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';

import {MealPlanFormView} from '../components/meals/MealPlanFormView';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate';
import {api} from '../lib/api';
import type {MealsStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealPlanEdit'>;

export const MealPlanEditScreen = ({route, navigation}: Props) => {
  const planId = route.params.planId ?? '';
  const isEdit = planId.length > 0;
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const {data: plan, isLoading: planLoading} = useQuery({
    queryKey: queryKeys.mealPlan(planId),
    queryFn: () => api.mealPlans.get(planId),
    enabled: isEdit,
  });

  const {data: meals = []} = useQuery({
    queryKey: queryKeys.meals(),
    queryFn: () => api.meals.list(),
  });

  const {data: recipes = [], isLoading: recipesLoading} = useQuery(
    recipeFormOptionsQueryOptions(params => api.recipes.list(params)),
  );

  const form = useMealPlanEditForm({plan, meals, recipes});

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

import {queryKeys, type MealsHubTab} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useMemo, useState} from 'react';

import {MealsHubView} from '../components/meals/MealsHubView';
import {api} from '../lib/api';
import type {MealsStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealsHub'>;

export const MealsHubScreen = ({navigation}: Props) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<MealsHubTab>('meals');

  const {data: meals = [], isLoading: mealsLoading} = useQuery({
    queryKey: queryKeys.meals(),
    queryFn: () => api.meals.list(),
  });

  const {data: plans = [], isLoading: plansLoading} = useQuery({
    queryKey: queryKeys.mealPlans(),
    queryFn: () => api.mealPlans.list(),
  });

  const isLoading = useMemo(
    () => (activeTab === 'meals' ? mealsLoading : plansLoading),
    [activeTab, mealsLoading, plansLoading],
  );

  const deleteMealMutation = useMutation({
    mutationFn: (id: string) => api.meals.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: queryKeys.meals()});
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id: string) => api.mealPlans.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: queryKeys.mealPlans()});
    },
  });

  return (
    <MealsHubView
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      meals={meals}
      plans={plans}
      isLoading={isLoading}
      onCreateMeal={() => {
        navigation.navigate('MealEdit', {});
      }}
      onCreatePlan={() => {
        navigation.navigate('MealPlanEdit', {});
      }}
      onMealPress={mealId => {
        navigation.navigate('MealDetail', {mealId});
      }}
      onPlanPress={planId => {
        navigation.navigate('MealPlanDetail', {planId});
      }}
      onDeleteMeal={id => {
        deleteMealMutation.mutate(id);
      }}
      onDeletePlan={id => {
        deletePlanMutation.mutate(id);
      }}
    />
  );
};

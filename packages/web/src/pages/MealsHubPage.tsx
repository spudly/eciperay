import {queryKeys, type MealsHubTab} from '@eciperay/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useMemo, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';

import {MealsHubView} from '../components/meals/MealsHubView.js';
import {eciperay} from '../lib/api.js';

export const MealsHubPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const tabParam = searchParams.get('tab');
  const [localTab, setLocalTab] = useState<MealsHubTab>('meals');
  const activeTab: MealsHubTab =
    tabParam === 'plans' || tabParam === 'meals' ? tabParam : localTab;

  const {data: meals = [], isLoading: mealsLoading} = useQuery({
    queryKey: queryKeys.meals(),
    queryFn: () => eciperay.meals.list(),
  });

  const {data: plans = [], isLoading: plansLoading} = useQuery({
    queryKey: queryKeys.mealPlans(),
    queryFn: () => eciperay.mealPlans.list(),
  });

  const isLoading = useMemo(
    () => (activeTab === 'meals' ? mealsLoading : plansLoading),
    [activeTab, mealsLoading, plansLoading],
  );

  const deleteMealMutation = useMutation({
    mutationFn: (id: string) => eciperay.meals.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: queryKeys.meals()});
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id: string) => eciperay.mealPlans.delete(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({queryKey: queryKeys.mealPlans()});
      // Drop the deleted plan's detail cache too, so a later visit to its
      // detail page cannot render the stale cached plan (#268).
      queryClient.removeQueries({queryKey: queryKeys.mealPlan(id)});
    },
  });

  return (
    <MealsHubView
      activeTab={activeTab}
      onSelectTab={tab => {
        setLocalTab(tab);
        setSearchParams(tab === 'meals' ? {} : {tab});
      }}
      meals={meals}
      plans={plans}
      isLoading={isLoading}
      onCreateMeal={() => {
        void navigate('/meals/new');
      }}
      onCreatePlan={() => {
        void navigate('/meal-plans/new');
      }}
      onMealPress={mealId => {
        void navigate(`/meals/${mealId}`);
      }}
      onPlanPress={planId => {
        void navigate(`/meal-plans/${planId}`);
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

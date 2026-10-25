import {
  formatSimpleNutrition,
  queryKeys,
  type MealsHubTab,
} from '@eciperay/client';
import type {MealPlan} from '@eciperay/types';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {MealsHubPage, type MealPlansPageItem} from '@spudly/ui/pages';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useMemo, useState} from 'react';

import {api} from '../lib/api';
import type {MealsStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealsHub'>;

/**
 * One plan row's meta line, composed screen-side for the DS pages: the entry
 * count with its pluralization, the plan's date range, and its nutrition
 * summary — the exact string the hub's hand-rolled plan row rendered inline
 * before the rewire. The string crosses the @spudly/ui/pages boundary
 * pre-composed (the RecipesPage subtitle precedent): pluralization and the
 * nutrition formatter are the app's, so the pages only render it.
 */
const formatMealPlanSubtitle = (plan: MealPlan) =>
  `${plan.entryCount} entr${plan.entryCount === 1 ? 'y' : 'ies'}${
    plan.startsOn && plan.endsOn ? ` · ${plan.startsOn} – ${plan.endsOn}` : ''
  }${formatSimpleNutrition(plan.nutrition) ? ` · ${formatSimpleNutrition(plan.nutrition)}` : ''}`;

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

  const planItems: MealPlansPageItem[] = plans.map(plan => ({
    id: plan.id,
    title: plan.title,
    subtitle: formatMealPlanSubtitle(plan),
  }));

  return (
    <MealsHubPage
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      meals={meals.map(meal => ({
        id: meal.id,
        title: meal.title,
        subtitle: `${meal.memberCount} recipe${
          meal.memberCount === 1 ? '' : 's'
        }${
          formatSimpleNutrition(meal.nutrition)
            ? ` · ${formatSimpleNutrition(meal.nutrition)}`
            : ''
        }`,
      }))}
      plans={planItems}
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

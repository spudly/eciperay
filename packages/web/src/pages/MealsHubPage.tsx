import {
  formatSimpleNutrition,
  queryKeys,
  type MealsHubTab,
} from '@eciperay/client';
import type {MealPlan} from '@eciperay/types';
import {
  MealsHubPage as MealsHubPageView,
  type MealPlansPageItem,
} from '@spudly/ui/pages';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useMemo, useState} from 'react';
import {useSearchParams} from 'react-router-dom';

import {eciperay} from '../lib/api.js';

/**
 * One plan row's meta line, composed host-side for the DS page: the entry
 * count with its pluralization, the plan's date range, and its nutrition
 * summary — the exact string the retired web view rendered inline. The
 * string crosses the @spudly/ui/pages boundary pre-composed (the
 * RecipesPage subtitle precedent): pluralization and the nutrition
 * formatter are the host's, so the page only renders it. Mirrors the app
 * screen's composition.
 */
const formatMealPlanSubtitle = (plan: MealPlan) =>
  `${plan.entryCount} entr${plan.entryCount === 1 ? 'y' : 'ies'}${
    plan.startsOn && plan.endsOn ? ` · ${plan.startsOn} – ${plan.endsOn}` : ''
  }${formatSimpleNutrition(plan.nutrition) ? ` · ${formatSimpleNutrition(plan.nutrition)}` : ''}`;

export const MealsHubPage = () => {
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

  const planItems: MealPlansPageItem[] = plans.map(plan => ({
    id: plan.id,
    href: `/meal-plans/${plan.id}`,
    title: plan.title,
    subtitle: formatMealPlanSubtitle(plan),
  }));

  return (
    <MealsHubPageView
      activeTab={activeTab}
      onSelectTab={tab => {
        setLocalTab(tab);
        setSearchParams(tab === 'meals' ? {} : {tab});
      }}
      meals={meals.map(meal => ({
        id: meal.id,
        href: `/meals/${meal.id}`,
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
      createMealHref="/meals/new"
      createPlanHref="/meal-plans/new"
      onDeleteMeal={id => {
        deleteMealMutation.mutate(id);
      }}
      onDeletePlan={id => {
        deletePlanMutation.mutate(id);
      }}
    />
  );
};

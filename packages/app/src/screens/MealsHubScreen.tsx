import {
  formatSimpleNutrition,
  queryKeys,
  type MealsHubTab,
} from '@eciperay/client';
import type {MealPlan} from '@eciperay/types';
import {MealsHubPage, type MealPlansPageItem} from '@spudly/ui/pages';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useMemo, useState} from 'react';

import {api} from '../lib/api';
import {
  mealEditHref,
  mealHref,
  mealPlanEditHref,
  mealPlanHref,
} from '../lib/deepLinks';

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

export const MealsHubScreen = () => {
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
    href: mealPlanHref(plan.id),
    title: plan.title,
    subtitle: formatMealPlanSubtitle(plan),
  }));

  return (
    <MealsHubPage
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      meals={meals.map(meal => ({
        id: meal.id,
        href: mealHref(meal.id),
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
      createMealHref={mealEditHref()}
      createPlanHref={mealPlanEditHref()}
      onDeleteMeal={id => {
        deleteMealMutation.mutate(id);
      }}
      onDeletePlan={id => {
        deletePlanMutation.mutate(id);
      }}
    />
  );
};

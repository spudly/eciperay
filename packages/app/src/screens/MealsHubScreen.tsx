import {
  formatSimpleNutrition,
  queryKeys,
  type MealsHubTab,
} from '@eciperay/client';
import type {MealPlan} from '@eciperay/types';
import type {I18n} from '@lingui/core';
import {useLingui} from '@lingui/react';
import {MealsHubPage, type MealPlansPageItem} from '@spudly/ui';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useMemo, useState} from 'react';

import {eciperay} from '../lib/api';
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
const formatMealPlanSubtitle = (i18n: I18n, plan: MealPlan) => {
  const nutrition = formatSimpleNutrition(plan.nutrition);
  return `${i18n._({
    id: 'mealsHub.entryCount',
    message: '{count, plural, one {{display} entry} other {{display} entries}}',
    values: {count: plan.entryCount, display: String(plan.entryCount)},
  })}${
    plan.startsOn && plan.endsOn ? ` · ${plan.startsOn} – ${plan.endsOn}` : ''
  }${nutrition ? ` · ${nutrition}` : ''}`;
};

export const MealsHubScreen = () => {
  const {i18n} = useLingui();
  const queryClient = useQueryClient();
  // The hub opens on the Plans tab (#538): meal plans are the
  // primary surface, matching the web top bar's direct landing.
  const [activeTab, setActiveTab] = useState<MealsHubTab>('plans');

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
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: queryKeys.mealPlans()});
    },
  });

  const planItems: MealPlansPageItem[] = plans.map(plan => ({
    id: plan.id,
    href: mealPlanHref(plan.id),
    title: plan.title,
    subtitle: formatMealPlanSubtitle(i18n, plan),
  }));

  return (
    <MealsHubPage
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      meals={meals.map(meal => ({
        id: meal.id,
        href: mealHref(meal.id),
        title: meal.title,
        subtitle: (() => {
          const nutrition = formatSimpleNutrition(meal.nutrition);
          return `${i18n._({
            id: 'mealsHub.recipeCount',
            message:
              '{count, plural, one {{display} recipe} other {{display} recipes}}',
            values: {count: meal.recipeCount, display: String(meal.recipeCount)},
          })}${nutrition ? ` · ${nutrition}` : ''}`;
        })(),
      }))}
      plans={planItems}
      loading={isLoading}
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

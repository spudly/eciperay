import {queryKeys, type MealsHubTab} from '@eciperay/client';
import type {AggregatedNutrition, MealPlan} from '@eciperay/types';
import {
  MealsHubPage as MealsHubPageView,
  type MealPlansPageItem,
} from '@spudly/ui';
import type {I18n} from '@lingui/core';
import {useLingui} from '@lingui/react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useMemo, useState} from 'react';
import {useSearchParams} from 'react-router-dom';

import {eciperay} from '../lib/api.js';

/**
 * One plan row's meta line, composed host-side for the DS page: the entry count
 * with its pluralization, the plan's date range, and its nutrition summary —
 * the exact string the retired web view rendered inline. The string crosses the
 * @spudly/ui/pages boundary pre-composed (the RecipesPage subtitle precedent):
 * pluralization and the nutrition formatter are the host's, so the page only
 * renders it. Mirrors the app screen's composition.
 */
/**
 * The nutrition suffix with locale-aware labels (#465): the same parts and
 * rounding as the client's formatSimpleNutrition, composed through the
 * shared mealDetail.nutrition* catalog messages so an en-XA subtitle does
 * not trail English labels after its localized count. Null when the
 * nutrition is missing or unavailable, so the suffix stays absent.
 */
const formatHubNutrition = (
  i18n: I18n,
  nutrition: AggregatedNutrition | null | undefined,
): string | null => {
  if (!nutrition || nutrition.status === 'unavailable') {
    return null;
  }
  const parts = [
    i18n._({
      id: 'mealDetail.nutritionCalories',
      message: '{value} cal',
      values: {value: Math.round(nutrition.calories)},
    }),
    i18n._({
      id: 'mealDetail.nutritionProtein',
      message: '{value}g protein',
      values: {value: Math.round(nutrition.proteinG)},
    }),
    i18n._({
      id: 'mealDetail.nutritionCarbs',
      message: '{value}g carbs',
      values: {value: Math.round(nutrition.carbsG)},
    }),
    i18n._({
      id: 'mealDetail.nutritionFat',
      message: '{value}g fat',
      values: {value: Math.round(nutrition.fatG)},
    }),
  ];
  if (nutrition.satietyScore !== null) {
    parts.push(
      i18n._({
        id: 'mealDetail.nutritionSatiety',
        message: 'satiety {value}',
        values: {value: Math.round(nutrition.satietyScore)},
      }),
    );
  }
  return parts.join(' · ');
};

const formatMealPlanSubtitle = (i18n: I18n, plan: MealPlan) => {
  const nutrition = formatHubNutrition(i18n, plan.nutrition);
  return `${i18n._({
    id: 'mealsHub.entryCount',
    message: '{count, plural, one {{display} entry} other {{display} entries}}',
    values: {count: plan.entryCount, display: String(plan.entryCount)},
  })}${
    plan.startsOn && plan.endsOn ? ` · ${plan.startsOn} – ${plan.endsOn}` : ''
  }${nutrition ? ` · ${nutrition}` : ''}`;
};

export const MealsHubPage = () => {
  const {i18n} = useLingui();
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
    // Always refetch on mount, ignoring the app-wide 30s staleTime: a
    // plan deleted while this list is unmounted (e.g. from its detail
    // page) invalidates nothing here, so serving the still-fresh cached
    // list on return showed the deleted plan until a full reload (#387).
    refetchOnMount: 'always',
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
      // Drop the deleted plan from the cached list immediately, so the
      // row is gone even before the invalidation refetch lands (#387).
      queryClient.setQueryData<MealPlan[]>(queryKeys.mealPlans(), current =>
        current?.filter(plan => plan.id !== id),
      );
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
    subtitle: formatMealPlanSubtitle(i18n, plan),
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
        subtitle: (() => {
          const nutrition = formatHubNutrition(i18n, meal.nutrition);
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

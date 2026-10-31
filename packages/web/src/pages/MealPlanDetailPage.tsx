import {formatSimpleNutrition, queryKeys} from '@eciperay/client';
import type {MealPlanDetail, NutritionGoalFieldProgress} from '@eciperay/types';
import {
  MealPlanDetailPage as MealPlanDetailPageView,
  type MealPlanDetailPageEntry,
  type MealPlanDetailPageNutritionGoals,
} from '@spudly/ui/pages';
import {useQuery} from '@tanstack/react-query';
import {useParams} from 'react-router-dom';

import {RouteErrorView} from '../components/RouteErrorView.js';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate.js';
import {eciperay} from '../lib/api.js';

const bandLabel = (band: NutritionGoalFieldProgress['band']): string => {
  if (band === 'under') {
    return 'Below goal';
  }
  if (band === 'over') {
    return 'Above goal';
  }
  return 'On track';
};

const goalValueLabel = (field: NutritionGoalFieldProgress): string =>
  `${Math.round(field.actual)} / ${Math.round(field.goal)} · ${bandLabel(field.band)}`;

/**
 * The composition the retired web view rendered, folded into the DS
 * page's view-models exactly as the app host composes it: the date range
 * joined from the plan's raw date strings, the nutrition summary from the
 * shared formatter, and the goal rows' rounded labels. The row labels
 * carry the qualifier naming what the server compared against the daily
 * goals (#266): the per-day average only when the plan has a valid date
 * range (`nutrition.perDay` is set then); the whole-plan total otherwise.
 * Satiety carries neither qualifier — it is a plan-wide score at any plan
 * length. The DS page has no caption slot, so the label is the lever (the
 * app's composition since its rewire).
 *
 * One visibility nuance rides on the DS contract: the page renders the
 * goals section when the plan has goal progress or a nutrition summary;
 * the retired view keyed the section on the raw nutrition object, so a
 * plan whose nutrition is present but unavailable with no goal progress
 * still showed the set-goals hint card. `goalsSectionVisibility` (DS #78)
 * passes "shown" for exactly that case and "auto" otherwise.
 */
const planDetailViewProps = (plan: MealPlanDetail, planId: string) => {
  const nutritionLabel = formatSimpleNutrition(plan.nutrition) ?? undefined;

  const progress = plan.goalProgress;
  const progressQualifier = plan.nutrition?.perDay
    ? '(per-day avg)'
    : '(plan total)';
  const nutritionGoals: MealPlanDetailPageNutritionGoals | null = progress
    ? {
        rows: [
          ...(progress.calories
            ? [
                {
                  label: `Calories ${progressQualifier}`,
                  valueLabel: goalValueLabel(progress.calories),
                },
              ]
            : []),
          ...(progress.proteinG
            ? [
                {
                  label: `Protein ${progressQualifier}`,
                  valueLabel: goalValueLabel(progress.proteinG),
                },
              ]
            : []),
          ...(progress.satietyScore
            ? [
                {
                  label: 'Satiety (plan-wide score)',
                  valueLabel: goalValueLabel(progress.satietyScore),
                },
              ]
            : []),
        ],
      }
    : null;

  const goalsSectionVisibility: 'shown' | 'auto' =
    plan.nutrition !== null &&
    plan.nutrition.status === 'unavailable' &&
    progress === null
      ? 'shown'
      : 'auto';

  const entries: MealPlanDetailPageEntry[] = plan.entries.map(entry => {
    const entryNutrition = formatSimpleNutrition(entry.nutrition);
    const nutritionSuffix = entryNutrition ? ` · ${entryNutrition}` : '';
    if (entry.type === 'meal') {
      return {
        id: entry.id,
        kind: 'meal',
        targetId: entry.mealId,
        href: `/meals/${entry.mealId}`,
        title: entry.title,
        subtitle: `Qty ${entry.quantity} · ${entry.memberCount} recipes${nutritionSuffix}`,
      };
    }
    return {
      id: entry.id,
      kind: 'recipe',
      targetId: entry.recipeId,
      href: `/recipes/${entry.recipeId}`,
      title: entry.title,
      subtitle: `Qty ${entry.quantity} · ${entry.servings} servings${nutritionSuffix}`,
      isUnavailable: entry.accessLost,
    };
  });

  return {
    state: 'ready' as const,
    title: plan.title,
    notes: plan.notes,
    dateRangeLabel:
      plan.startsOn && plan.endsOn
        ? `${plan.startsOn} – ${plan.endsOn}`
        : undefined,
    nutritionLabel,
    nutritionGoals,
    goalsSectionVisibility,
    goalsHref: '/profile',
    shoppingListHref: `/meal-plans/${planId}/shopping-list`,
    editHref: `/meal-plans/${planId}/edit`,
    entries,
  };
};

export const MealPlanDetailPage = () => {
  const {planId = ''} = useParams();

  const {
    data: plan,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.mealPlan(planId),
    queryFn: () => eciperay.mealPlans.get(planId),
    enabled: planId.length > 0,
  });

  // The meal-plans route answers a missing plan with 404 and
  // `{error: 'Meal plan not found'}`, which the API client throws as that
  // message (a body without an `error` field falls back to
  // `API error <status>:`); either shape reads as not found.
  const isNotFoundError =
    error instanceof Error &&
    (error.message === 'Meal plan not found' ||
      error.message.startsWith('API error 404'));

  // A 404 wins over a cached plan: after a plan is deleted elsewhere, a
  // detail refetch answers 404 while TanStack Query retains the cached
  // data, so gating only on `!plan` would keep showing the deleted plan.
  if (isNotFoundError) {
    return <RouteErrorView isNotFound />;
  }

  // A settled query with no plan means the plan does not exist (deleted or
  // a bad link): show a not-found state instead of gating on `!plan`
  // forever, which left the page on the loading skeleton indefinitely
  // (#260). No error at all also reads as not found; anything else is a
  // generic load failure.
  if (!isLoading && !plan) {
    return <RouteErrorView isNotFound={!error} />;
  }

  return (
    <ScreenLoadingGate pending={isLoading}>
      {plan ? (
        <MealPlanDetailPageView {...planDetailViewProps(plan, planId)} />
      ) : null}
    </ScreenLoadingGate>
  );
};

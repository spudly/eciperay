import {
  buildMealPlanWeekView,
  buildRecipePath,
  buildWeeklyTotalsBand,
  formatSimpleNutrition,
  queryKeys,
} from '@eciperay/client';
import type {
  MealPlanDetail,
  MealPlanEntry,
  NutritionGoalFieldProgress,
} from '@eciperay/types';
import {
  MealPlanDetailPage as MealPlanDetailPageView,
  type MealPlanDetailPageEntry,
  type MealPlanDetailPageNutritionGoals,
} from '@spudly/ui';
import type {I18n} from '@lingui/core';
import {useLingui} from '@lingui/react';
import {useQuery} from '@tanstack/react-query';
import {useParams} from 'react-router-dom';

import {RouteErrorView} from '../components/RouteErrorView.js';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate.js';
import {eciperay} from '../lib/api.js';

const bandLabel = (
  i18n: I18n,
  band: NutritionGoalFieldProgress['band'],
): string => {
  if (band === 'under') {
    return i18n._({id: 'mealPlanDetail.goalBandBelow', message: 'Below goal'});
  }
  if (band === 'over') {
    return i18n._({id: 'mealPlanDetail.goalBandAbove', message: 'Above goal'});
  }
  return i18n._({id: 'mealPlanDetail.goalBandOnTrack', message: 'On track'});
};

const formatGoalNumber = (value: number): string =>
  Math.round(value).toLocaleString('en-US');

const goalRangeLabel = (
  i18n: I18n,
  field: NutritionGoalFieldProgress,
): string => {
  if (field.min !== null && field.max !== null) {
    return `${formatGoalNumber(field.min)}–${formatGoalNumber(field.max)}`;
  }
  if (field.min !== null) {
    return i18n._({
      id: 'mealPlanDetail.goalRangeAtLeast',
      message: 'at least {min}',
      values: {min: formatGoalNumber(field.min)},
    });
  }
  if (field.max !== null) {
    return i18n._({
      id: 'mealPlanDetail.goalRangeUpTo',
      message: 'up to {max}',
      values: {max: formatGoalNumber(field.max)},
    });
  }
  // Unreachable: progress is produced only when a bound is set.
  return '';
};

const goalValueLabel = (
  i18n: I18n,
  field: NutritionGoalFieldProgress,
): string =>
  `${formatGoalNumber(field.actual)} / ${goalRangeLabel(i18n, field)} · ${bandLabel(i18n, field.band)}`;

/**
 * The composition the retired web view rendered, folded into the DS page's
 * view-models exactly as the app host composes it: the date range joined from
 * the plan's raw date strings, the nutrition summary from the shared formatter,
 * and the goal rows' rounded actual / range labels. The row labels carry the
 * qualifier naming what the server compared against the daily goals (#266): the
 * per-day average only when the plan has a valid date range (`nutrition.perDay`
 * is set then); the whole-plan total otherwise. Satiety carries neither
 * qualifier — it is a plan-wide score at any plan length. The DS page has no
 * caption slot, so the label is the lever (the app's composition since its
 * rewire).
 *
 * One visibility nuance rides on the DS contract: the page renders the goals
 * section when the plan has goal progress or a nutrition summary; the retired
 * view keyed the section on the raw nutrition object, so a plan whose nutrition
 * is present but unavailable with no goal progress still showed the set-goals
 * hint card. `goalsSectionVisibility` (DS #78) passes "shown" for exactly that
 * case and "auto" otherwise.
 */
const planDetailViewProps = (i18n: I18n, plan: MealPlanDetail, planId: string) => {
  const nutritionLabel = formatSimpleNutrition(plan.nutrition) ?? undefined;

  const progress = plan.goalProgress;
  const progressQualifier = plan.nutrition?.perDay
    ? i18n._({
        id: 'mealPlanDetail.goalQualifierPerDay',
        message: '(per-day avg)',
      })
    : i18n._({
        id: 'mealPlanDetail.goalQualifierPlanTotal',
        message: '(plan total)',
      });
  const nutritionGoals: MealPlanDetailPageNutritionGoals | null = progress
    ? {
        rows: [
          ...(progress.calories
            ? [
                {
                  label: i18n._({
                    id: 'mealPlanDetail.goalCaloriesLabel',
                    message: 'Calories {qualifier}',
                    values: {qualifier: progressQualifier},
                  }),
                  valueLabel: goalValueLabel(i18n, progress.calories),
                },
              ]
            : []),
          ...(progress.proteinG
            ? [
                {
                  label: i18n._({
                    id: 'mealPlanDetail.goalProteinLabel',
                    message: 'Protein {qualifier}',
                    values: {qualifier: progressQualifier},
                  }),
                  valueLabel: goalValueLabel(i18n, progress.proteinG),
                },
              ]
            : []),
          ...(progress.satietyScore
            ? [
                {
                  label: i18n._({
                    id: 'mealPlanDetail.goalSatietyLabel',
                    message: 'Satiety (plan-wide score)',
                  }),
                  valueLabel: goalValueLabel(i18n, progress.satietyScore),
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

  const toDetailEntry = (entry: MealPlanEntry): MealPlanDetailPageEntry => {
    const entryNutrition = formatSimpleNutrition(entry.nutrition);
    const nutritionSuffix = entryNutrition ? ` · ${entryNutrition}` : '';
    if (entry.type === 'meal') {
      return {
        id: entry.id,
        kind: 'meal',
        targetId: entry.mealId,
        href: `/meals/${entry.mealId}`,
        title: entry.title,
        subtitle: `Qty ${entry.quantity} · ${entry.recipeCount} recipe${entry.recipeCount === 1 ? '' : 's'}${nutritionSuffix}`,
      };
    }
    return {
      id: entry.id,
      kind: 'recipe',
      targetId: entry.recipeId,
      href: buildRecipePath({id: entry.recipeId, title: entry.title}),
      title: entry.title,
      subtitle: `Qty ${entry.quantity} · Servings to cook: ${entry.servingsToCook} · Servings to eat: ${entry.servingsToEat}${nutritionSuffix}`,
      isUnavailable: entry.accessLost,
    };
  };
  const entries: MealPlanDetailPageEntry[] = plan.entries.map(toDetailEntry);

  return {
    state: 'ready' as const,
    title: plan.title,
    notes: plan.notes,
    dateRangeLabel:
      plan.startsOn && plan.endsOn
        ? `${plan.startsOn} – ${plan.endsOn}`
        : undefined,
    nutritionLabel,
    // Weekly totals + per-day averages band (DS #414), composed from
    // the plan's eaten nutrition (#363): totals from the plan totals,
    // averages from its per-day figure.
    weeklyTotals: buildWeeklyTotalsBand(plan.nutrition),
    // Week view (#539 / DS #660): entries grouped by their day with
    // per-day totals from servings eaten; null when the plan has no
    // day anchor, in which case the page keeps its flat entry list.
    weekView: buildMealPlanWeekView(plan, toDetailEntry),
    nutritionGoals,
    goalsSectionVisibility,
    goalsHref: '/profile',
    shoppingListHref: `/meal-plans/${planId}/shopping-list`,
    editHref: `/meal-plans/${planId}/edit`,
    entries,
  };
};

export const MealPlanDetailPage = () => {
  const {i18n} = useLingui();
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
        <MealPlanDetailPageView {...planDetailViewProps(i18n, plan, planId)} />
      ) : null}
    </ScreenLoadingGate>
  );
};

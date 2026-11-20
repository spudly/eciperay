import {
  buildRecipePath,
  formatSimpleNutrition,
  netCarbsG,
  queryKeys,
} from '@eciperay/client';
import type {RecipeNutritionSummary} from '@eciperay/types';
import type {I18n} from '@lingui/core';
import {useLingui} from '@lingui/react';
import {MealDetailPage as MealDetailPageView} from '@spudly/ui';
import {useQuery} from '@tanstack/react-query';
import {useParams} from 'react-router-dom';

import {RouteErrorView} from '../components/RouteErrorView.js';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate.js';
import {eciperay} from '../lib/api.js';

/**
 * One member row's nutrition line, composed host-side for the DS page: the
 * calories / protein / carbs / fat / satiety parts the retired web view
 * rendered inline. The string crosses the @spudly/ui/pages boundary
 * pre-composed inside the member subtitle (the RecipesPage subtitle precedent):
 * the rounding is the host's, so the page only renders it. Mirrors the app
 * screen's composition.
 */
const formatMemberNutrition = (
  i18n: I18n,
  summary: RecipeNutritionSummary,
  scale = 1,
): string | null => {
  const parts: string[] = [];
  if (summary.calories !== null) {
    parts.push(
      i18n._({
        id: 'mealDetail.nutritionCalories',
        message: '{value} cal',
        values: {value: Math.round(summary.calories * scale)},
      }),
    );
  }
  if (summary.proteinG !== null) {
    parts.push(
      i18n._({
        id: 'mealDetail.nutritionProtein',
        message: '{value}g protein',
        values: {value: Math.round(summary.proteinG * scale)},
      }),
    );
  }
  if (summary.carbsG !== null) {
    parts.push(
      i18n._({
        id: 'mealDetail.nutritionCarbs',
        message: '{value}g carbs',
        values: {value: Math.round(summary.carbsG * scale)},
      }),
    );
    // Net carbs beside total carbs (#613); omitted when fiber is unknown.
    const net = netCarbsG(summary);
    if (net !== null) {
      parts.push(
        i18n._({
          id: 'mealDetail.nutritionNetCarbs',
          message: '{value}g net carbs',
          values: {value: Math.round(net * scale)},
        }),
      );
    }
  }
  if (summary.fatG !== null) {
    parts.push(
      i18n._({
        id: 'mealDetail.nutritionFat',
        message: '{value}g fat',
        values: {value: Math.round(summary.fatG * scale)},
      }),
    );
  }
  if (summary.satietyScore !== null) {
    parts.push(
      i18n._({
        id: 'mealDetail.nutritionSatiety',
        message: 'satiety {value}',
        values: {value: Math.round(summary.satietyScore)},
      }),
    );
  }
  return parts.length > 0 ? parts.join(' · ') : null;
};

const servingsLabel = (
  i18n: I18n,
  servingsToCook: number,
  servingsToEat: number,
): string =>
  i18n._({
    id: 'mealDetail.servingsLabel',
    message: 'Servings to cook: {cook} · Servings to eat: {eat}',
    values: {cook: servingsToCook, eat: servingsToEat},
  });

export const MealDetailPage = () => {
  const {i18n} = useLingui();
  const {mealId = ''} = useParams();

  const {
    data: meal,
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.meal(mealId),
    queryFn: () => eciperay.meals.get(mealId),
    enabled: mealId.length > 0,
  });

  // The meals route answers a missing meal with 404 and
  // `{error: 'Meal not found'}`, which the API client throws as that
  // message (a body without an `error` field falls back to
  // `API error <status>:`); either shape reads as not found.
  const isNotFoundError =
    error instanceof Error &&
    (error.message === 'Meal not found' ||
      error.message.startsWith('API error 404'));

  // A 404 wins over a cached meal: after a meal is deleted elsewhere,
  // a detail refetch answers 404 while TanStack Query retains the cached
  // data, so gating only on `!meal` would keep showing the deleted meal.
  if (isNotFoundError) {
    return <RouteErrorView isNotFound />;
  }

  // No meal id in the route: nothing can load, so it reads as not
  // found rather than a disabled query's endless pending state.
  if (!mealId) {
    return <RouteErrorView isNotFound />;
  }

  // A settled non-404 error is a generic load failure — and it wins
  // over a cached meal, just as a 404 does above: when a refetch fails
  // (e.g. a 500), TanStack Query retains the cached data and exposes
  // the error, so gating only on `!meal` would keep showing the stale
  // meal instead of the error state. `isPending`, not `isLoading`: a
  // paused (offline) fetch has isLoading false while the query is
  // still pending, and must stay on the loading gate.
  if (!isPending && error) {
    return <RouteErrorView isNotFound={false} />;
  }

  // A settled query with no meal and no error means the meal does not
  // exist (deleted or a bad link): show a not-found state instead of
  // gating on `!meal` forever, which left the page on the loading
  // skeleton indefinitely (#356).
  if (!isPending && !meal) {
    return <RouteErrorView isNotFound />;
  }

  return (
    <ScreenLoadingGate pending={isPending || !meal}>
      {meal ? (
        <MealDetailPageView
          title={meal.title}
          notes={meal.notes}
          nutritionLabel={formatSimpleNutrition(meal.nutrition)}
          members={meal.members.map(member => ({
            recipeId: member.recipeId,
            href: buildRecipePath({id: member.recipeId, title: member.title}),
            title: member.title,
            subtitle: `${servingsLabel(i18n, member.servingsToCook, member.servingsToEat)}${
              formatMemberNutrition(i18n, member)
                ? ` · ${formatMemberNutrition(i18n, member)}`
                : ''
            }`,
            isUnavailable: member.accessLost,
          }))}
          ingredients={(meal.ingredients ?? []).map((ingredient, index) => {
            // A direct ingredient's stored nutrition is per serving, so
            // its row shows the entry's total contribution (scaled by
            // its servings), like each member recipe's row.
            const quantityLabel =
              ingredient.quantity === null
                ? null
                : `${ingredient.quantity}${
                    ingredient.unit ? ` ${ingredient.unit}` : ''
                  }`;
            // The row's nutrition is what the owner eats (#363): the
            // per-serving macros scale by servings-to-eat.
            const nutritionLabel = formatMemberNutrition(
              i18n,
              ingredient,
              ingredient.servingsToEat,
            );
            return {
              id: `ingredient-${ingredient.sortOrder}-${index}`,
              name: ingredient.name,
              subtitle: [
                quantityLabel,
                servingsLabel(
                  i18n,
                  ingredient.servingsToCook,
                  ingredient.servingsToEat,
                ),
                nutritionLabel,
              ]
                .filter(Boolean)
                .join(' · '),
            };
          })}
          cookHref={`/meals/${mealId}/cook`}
          editHref={`/meals/${mealId}/edit`}
        />
      ) : null}
    </ScreenLoadingGate>
  );
};

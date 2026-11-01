import {formatSimpleNutrition, queryKeys} from '@eciperay/client';
import type {MealRecipeMember} from '@eciperay/types';
import {MealDetailPage as MealDetailPageView} from '@spudly/ui/pages';
import {useQuery} from '@tanstack/react-query';
import {useParams} from 'react-router-dom';

import {RouteErrorView} from '../components/RouteErrorView.js';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate.js';
import {eciperay} from '../lib/api.js';

/**
 * One member row's nutrition line, composed host-side for the DS page: the
 * calories / protein / satiety parts the retired web view rendered inline.
 * The string crosses the @spudly/ui/pages boundary pre-composed inside the
 * member subtitle (the RecipesPage subtitle precedent): the rounding is
 * the host's, so the page only renders it. Mirrors the app screen's
 * composition.
 */
const formatMemberNutrition = (member: MealRecipeMember): string | null => {
  const parts: string[] = [];
  if (member.calories !== null) {
    parts.push(`${Math.round(member.calories)} cal`);
  }
  if (member.proteinG !== null) {
    parts.push(`${Math.round(member.proteinG)}g protein`);
  }
  if (member.satietyScore !== null) {
    parts.push(`satiety ${Math.round(member.satietyScore)}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
};

export const MealDetailPage = () => {
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
            href: `/recipes/${member.recipeId}`,
            title: member.title,
            subtitle: `${member.servings} serving${
              member.servings === 1 ? '' : 's'
            }${
              formatMemberNutrition(member)
                ? ` · ${formatMemberNutrition(member)}`
                : ''
            }`,
            isUnavailable: member.accessLost,
          }))}
          cookHref={`/meals/${mealId}/cook`}
          editHref={`/meals/${mealId}/edit`}
        />
      ) : null}
    </ScreenLoadingGate>
  );
};

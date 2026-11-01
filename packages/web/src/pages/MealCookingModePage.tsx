import {queryKeys} from '@eciperay/client';
import {MealCookingModePage as MealCookingModePageView} from '@spudly/ui/pages';
import {useQuery} from '@tanstack/react-query';
import {useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import {ScreenLoadingGate} from '../components/ScreenLoadingGate.js';
import {eciperay} from '../lib/api.js';

export const MealCookingModePage = () => {
  const {mealId = ''} = useParams();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);

  const {
    data: meal,
    error: mealError,
    isLoadingError: isMealLoadingError,
  } = useQuery({
    queryKey: queryKeys.meal(mealId),
    queryFn: () => eciperay.meals.get(mealId),
    enabled: mealId.length > 0,
  });

  const {
    data: plan,
    isLoading,
    error: planError,
    isLoadingError: isPlanLoadingError,
  } = useQuery({
    queryKey: queryKeys.mealCookPlan(mealId),
    queryFn: () => eciperay.meals.cookPlan(mealId),
    enabled: mealId.length > 0,
  });

  const onDone = () => {
    void navigate(`/meals/${mealId}`);
  };

  // The meals routes answer a missing meal with 404 and
  // `{error: 'Meal not found'}`, which the API client throws as that
  // message (a body without an `error` field falls back to
  // `API error <status>:`); either shape reads as not found. The
  // cook-plan route returns the same 404 for a missing meal.
  const isNotFoundError = [mealError, planError].some(
    error =>
      error instanceof Error &&
      (error.message === 'Meal not found' ||
        error.message.startsWith('API error 404')),
  );

  // When there is no meal to return to, the meal detail is not a safe
  // destination: MealDetailPage gates on `!meal` forever and renders
  // no navigation action, so a known-missing meal (404) — or any
  // initial meal-load failure, which leaves no meal data at all —
  // sends Done to the meals hub instead. A cook-plan-only failure
  // with the meal loaded keeps the meal-detail destination.
  const onErrorDone = () => {
    void navigate(isNotFoundError || !meal ? '/meals' : `/meals/${mealId}`);
  };

  // A failed meal or cook-plan load must not hang on the loading gate
  // forever (#338): the DS page's error state renders as soon as either
  // query fails, carrying the meal title when that query succeeded.
  // Only an initial-load failure (or a 404, which wins over cached
  // data like the detail pages) replaces the view: a background
  // refetch error keeps the cooking controls while cached data lasts.
  if (isMealLoadingError || isPlanLoadingError || isNotFoundError) {
    return (
      <MealCookingModePageView
        state="error"
        {...(meal ? {mealTitle: meal.title} : {})}
        onDone={onErrorDone}
      />
    );
  }

  return (
    <ScreenLoadingGate pending={isLoading || !plan || !meal}>
      {plan && meal ? (
        <MealCookingModePageView
          steps={plan.steps}
          mealTitle={meal.title}
          stepIndex={stepIndex}
          onPrev={() => {
            setStepIndex(current => Math.max(0, current - 1));
          }}
          onNext={() => {
            setStepIndex(current =>
              Math.min(plan.steps.length - 1, current + 1),
            );
          }}
          onDone={onDone}
        />
      ) : null}
    </ScreenLoadingGate>
  );
};

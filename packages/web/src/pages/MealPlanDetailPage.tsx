import {queryKeys} from '@eciperay/client';
import {useQuery} from '@tanstack/react-query';
import {useNavigate, useParams} from 'react-router-dom';

import {MealPlanDetailView} from '../components/meals/MealPlanDetailView.js';
import {RouteErrorView} from '../components/RouteErrorView.js';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate.js';
import {eciperay} from '../lib/api.js';

export const MealPlanDetailPage = () => {
  const {planId = ''} = useParams();
  const navigate = useNavigate();

  const {data: plan, isLoading, error} = useQuery({
    queryKey: queryKeys.mealPlan(planId),
    queryFn: () => eciperay.mealPlans.get(planId),
    enabled: planId.length > 0,
  });

  // A settled query with no plan means the plan does not exist (deleted or
  // a bad link): show a not-found state instead of gating on `!plan`
  // forever, which left the page on the loading skeleton indefinitely
  // (#260). The meal-plans route answers a missing plan with 404 and
  // `{error: 'Meal plan not found'}`, which the API client throws as that
  // message (a body without an `error` field falls back to
  // `API error <status>:`); either shape — or no error at all — reads as
  // not found, anything else as a generic load failure.
  if (!isLoading && !plan) {
    const isNotFound =
      !error ||
      (error instanceof Error &&
        (error.message === 'Meal plan not found' ||
          error.message.startsWith('API error 404')));
    return <RouteErrorView isNotFound={isNotFound} />;
  }

  return (
    <ScreenLoadingGate pending={isLoading}>
      {plan ? (
        <MealPlanDetailView
          plan={plan}
          onEdit={() => {
            void navigate(`/meal-plans/${planId}/edit`);
          }}
          onShoppingList={() => {
            void navigate(`/meal-plans/${planId}/shopping-list`);
          }}
          onMealPress={mealId => {
            void navigate(`/meals/${mealId}`);
          }}
          onRecipePress={recipeId => {
            void navigate(`/recipes/${recipeId}`);
          }}
          onSetGoalsPress={() => {
            void navigate('/profile');
          }}
        />
      ) : null}
    </ScreenLoadingGate>
  );
};

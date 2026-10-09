import {queryKeys} from '@eciperay/client';
import {useQuery} from '@tanstack/react-query';
import {useNavigate, useParams} from 'react-router-dom';

import {MealPlanDetailView} from '../components/meals/MealPlanDetailView.js';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate.js';
import {eciperay} from '../lib/api.js';

export const MealPlanDetailPage = () => {
  const {planId = ''} = useParams();
  const navigate = useNavigate();

  const {data: plan, isLoading} = useQuery({
    queryKey: queryKeys.mealPlan(planId),
    queryFn: () => eciperay.mealPlans.get(planId),
    enabled: planId.length > 0,
  });

  return (
    <ScreenLoadingGate pending={isLoading || !plan}>
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

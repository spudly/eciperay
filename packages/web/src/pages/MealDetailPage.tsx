import {queryKeys} from '@eciperay/client';
import {useQuery} from '@tanstack/react-query';
import {useNavigate, useParams} from 'react-router-dom';

import {MealDetailView} from '../components/meals/MealDetailView.js';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate.js';
import {eciperay} from '../lib/api.js';

export const MealDetailPage = () => {
  const {mealId = ''} = useParams();
  const navigate = useNavigate();

  const {data: meal, isLoading} = useQuery({
    queryKey: queryKeys.meal(mealId),
    queryFn: () => eciperay.meals.get(mealId),
    enabled: mealId.length > 0,
  });

  return (
    <ScreenLoadingGate pending={isLoading || !meal}>
      {meal ? (
        <MealDetailView
          meal={meal}
          onEdit={() => {
            void navigate(`/meals/${mealId}/edit`);
          }}
          onCook={() => {
            void navigate(`/meals/${mealId}/cook`);
          }}
          onRecipePress={recipeId => {
            void navigate(`/recipes/${recipeId}`);
          }}
        />
      ) : null}
    </ScreenLoadingGate>
  );
};

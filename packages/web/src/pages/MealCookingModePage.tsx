import {queryKeys} from '@eciperay/client';
import {useQuery} from '@tanstack/react-query';
import {useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import {MealCookingModeView} from '../components/meals/MealCookingModeView.js';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate.js';
import {eciperay} from '../lib/api.js';

export const MealCookingModePage = () => {
  const {mealId = ''} = useParams();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);

  const {data: meal} = useQuery({
    queryKey: queryKeys.meal(mealId),
    queryFn: () => eciperay.meals.get(mealId),
    enabled: mealId.length > 0,
  });

  const {data: plan, isLoading} = useQuery({
    queryKey: queryKeys.mealCookPlan(mealId),
    queryFn: () => eciperay.meals.cookPlan(mealId),
    enabled: mealId.length > 0,
  });

  return (
    <ScreenLoadingGate pending={isLoading || !plan || !meal}>
      {plan && meal ? (
        <MealCookingModeView
          plan={plan}
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
          onDone={() => {
            void navigate(`/meals/${mealId}`);
          }}
        />
      ) : null}
    </ScreenLoadingGate>
  );
};

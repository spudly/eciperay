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

  const {data: meal, isError: isMealError} = useQuery({
    queryKey: queryKeys.meal(mealId),
    queryFn: () => eciperay.meals.get(mealId),
    enabled: mealId.length > 0,
  });

  const {
    data: plan,
    isLoading,
    isError: isPlanError,
  } = useQuery({
    queryKey: queryKeys.mealCookPlan(mealId),
    queryFn: () => eciperay.meals.cookPlan(mealId),
    enabled: mealId.length > 0,
  });

  const onDone = () => {
    void navigate(`/meals/${mealId}`);
  };

  // A failed meal or cook-plan load must not hang on the loading gate
  // forever (#338): the DS page's error state renders as soon as either
  // query fails, carrying the meal title when that query succeeded.
  if (isMealError || isPlanError) {
    return (
      <MealCookingModePageView
        state="error"
        {...(meal ? {mealTitle: meal.title} : {})}
        onDone={onDone}
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

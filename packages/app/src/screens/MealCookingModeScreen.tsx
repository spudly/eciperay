import {queryKeys} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {MealCookingModePage} from '@spudly/ui/pages';
import {useQuery} from '@tanstack/react-query';
import {useState} from 'react';

import {ScreenLoadingGate} from '../components/ScreenLoadingGate';
import {api} from '../lib/api';
import type {MealsStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealCookingMode'>;

export const MealCookingModeScreen = ({route, navigation}: Props) => {
  const {mealId} = route.params;
  const [stepIndex, setStepIndex] = useState(0);

  const {data: meal, isError: isMealError} = useQuery({
    queryKey: queryKeys.meal(mealId),
    queryFn: () => api.meals.get(mealId),
  });

  const {
    data: plan,
    isLoading,
    isError: isPlanError,
  } = useQuery({
    queryKey: queryKeys.mealCookPlan(mealId),
    queryFn: () => api.meals.cookPlan(mealId),
  });

  const onDone = () => {
    navigation.navigate('MealDetail', {mealId});
  };

  // A failed meal or cook-plan load must not hang on the loading gate
  // forever (#338): the DS page's error state renders as soon as either
  // query fails, carrying the meal title when that query succeeded.
  if (isMealError || isPlanError) {
    return (
      <MealCookingModePage
        state="error"
        {...(meal ? {mealTitle: meal.title} : {})}
        onDone={onDone}
      />
    );
  }

  return (
    <ScreenLoadingGate pending={isLoading || !plan || !meal}>
      {plan && meal ? (
        <MealCookingModePage
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

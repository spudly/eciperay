import {queryKeys} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useQuery} from '@tanstack/react-query';
import {useState} from 'react';

import {MealCookingModeView} from '../components/meals/MealCookingModeView';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate';
import {api} from '../lib/api';
import type {MealsStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealCookingMode'>;

export const MealCookingModeScreen = ({route, navigation}: Props) => {
  const {mealId} = route.params;
  const [stepIndex, setStepIndex] = useState(0);

  const {data: meal} = useQuery({
    queryKey: queryKeys.meal(mealId),
    queryFn: () => api.meals.get(mealId),
  });

  const {data: plan, isLoading} = useQuery({
    queryKey: queryKeys.mealCookPlan(mealId),
    queryFn: () => api.meals.cookPlan(mealId),
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
            navigation.navigate('MealDetail', {mealId});
          }}
        />
      ) : null}
    </ScreenLoadingGate>
  );
};

import {defaultNutritionGoals, errorMessage, queryKeys} from '@eciperay/client';
import type {NutritionGoals} from '@eciperay/types';
import {NutritionGoalsForm} from '@spudly/ui';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';

import {eciperay} from '../../lib/api.js';

export const ProfileNutritionGoalsSection = () => {
  const queryClient = useQueryClient();
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals>(
    defaultNutritionGoals(),
  );
  const [goalsError, setGoalsError] = useState<string | null>(null);

  const {data: savedGoals} = useQuery({
    queryKey: queryKeys.nutritionGoals(),
    queryFn: () => eciperay.account.getNutritionGoals(),
  });

  useEffect(() => {
    if (savedGoals) {
      setNutritionGoals(savedGoals);
    }
  }, [savedGoals]);

  const saveGoalsMutation = useMutation({
    mutationFn: () => eciperay.account.putNutritionGoals(nutritionGoals),
    onSuccess: data => {
      setNutritionGoals(data);
      setGoalsError(null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.nutritionGoals(),
      });
      void queryClient.invalidateQueries({queryKey: queryKeys.mealPlans()});
    },
    onError: error => {
      setGoalsError(errorMessage(error));
    },
  });

  return (
    <NutritionGoalsForm
      goals={nutritionGoals}
      saving={saveGoalsMutation.isPending}
      error={goalsError}
      onChange={setNutritionGoals}
      onSave={() => {
        saveGoalsMutation.mutate();
      }}
    />
  );
};

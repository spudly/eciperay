import {defaultNutritionGoals, errorMessage, queryKeys} from '@eciperay/client';
import type {NutritionGoals} from '@eciperay/types';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';

import {eciperay} from '../../lib/api.js';

// DS 14: ProfilePage renders the NutritionGoalsForm itself from the
// `nutritionGoals` data prop (#511), so this module is now the
// section's host logic as a hook — the goals query, the form state
// as a whole, and the save mutation — returning the data-prop
// view-model. (The host-side Tamagui mirror of the form is retired
// with the slot it filled.)
export const useProfileNutritionGoalsProps = () => {
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

  return {
    goals: nutritionGoals,
    onChange: setNutritionGoals,
    saving: saveGoalsMutation.isPending,
    error: goalsError,
    onSave: () => {
      saveGoalsMutation.mutate();
    },
  };
};

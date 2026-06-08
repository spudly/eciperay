import React from 'react';
import {Text, View} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import type {NutritionInfo} from '@recipoo/types';

import {apiFetch} from '../../lib/api';

const NutritionRow = ({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) => (
  <View className="flex-row justify-between py-3 border-b border-gray-100">
    <Text className="text-base text-gray-700">{label}</Text>
    <Text className="text-base font-semibold text-gray-900">
      {value}
      {unit}
    </Text>
  </View>
);

const fetchNutrition = (recipeId: string) =>
  apiFetch<NutritionInfo>(`/recipes/${recipeId}/ai/nutrition`);

export const NutritionTab = ({recipeId}: {recipeId: string}) => {
  const {data, isLoading} = useQuery({
    queryKey: ['nutrition', recipeId],
    queryFn: () => fetchNutrition(recipeId),
  });
  if (isLoading) {
    return <Text className="p-4 text-muted">Estimating nutrition…</Text>;
  }
  if (!data) {
    return null;
  }
  return (
    <View className="p-4">
      <Text className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">
        Per Serving
      </Text>
      <NutritionRow
        label="Calories"
        value={data.calories}
        unit=""
      />
      <NutritionRow
        label="Protein"
        value={data.proteinG}
        unit="g"
      />
      <NutritionRow
        label="Carbs"
        value={data.carbsG}
        unit="g"
      />
      <NutritionRow
        label="Fat"
        value={data.fatG}
        unit="g"
      />
      {data.fiberG ? (
        <NutritionRow
          label="Fiber"
          value={data.fiberG}
          unit="g"
        />
      ) : null}
      {data.sodiumMg ? (
        <NutritionRow
          label="Sodium"
          value={data.sodiumMg}
          unit="mg"
        />
      ) : null}
      <Text className="text-xs text-muted mt-4">{data.disclaimer}</Text>
    </View>
  );
};

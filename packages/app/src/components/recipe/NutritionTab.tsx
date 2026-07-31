import {
  makeRecipeDetail,
  queryKeys,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import {useQuery} from '@tanstack/react-query';
import React from 'react';
import {Text, View} from 'react-native';

import {api} from '../../lib/api';

const NutritionRow = ({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) => (
  <View className="flex-row justify-between border-b border-gray-100 py-3">
    <Text className="text-base text-gray-700">{label}</Text>
    <Text className="text-base font-semibold text-gray-900">
      {value}
      {unit}
    </Text>
  </View>
);

export const NutritionTab = ({recipeId}: {recipeId: string}) => {
  const {data, isLoading} = useQuery({
    queryKey: queryKeys.nutrition(recipeId),
    queryFn: () => api.ai.nutrition(recipeId),
  });

  if (isLoading) {
    return <Text className="text-muted p-4">Estimating nutrition…</Text>;
  }
  if (!data) {
    return null;
  }
  return (
    <View className="p-4">
      <Text
        className="
          mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500
        "
      >
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
      <Text className="text-muted mt-4 text-xs">{data.disclaimer}</Text>
    </View>
  );
};

if (__DEV__) {
  const nutritionTabDemo: ShowcaseDemoRenderer = ({Frame}) => (
    <Frame>
      <NutritionTab recipeId={makeRecipeDetail().id} />
    </Frame>
  );
  NutritionTab.demo = nutritionTabDemo;
}

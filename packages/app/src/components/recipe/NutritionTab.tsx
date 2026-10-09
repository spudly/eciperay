import {
  makeRecipeDetail,
  nutritionTabRows,
  queryKeys,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import React, {useState} from 'react';
import {Pressable, Text, View} from 'react-native';

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
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const {data, isLoading, isFetching} = useQuery({
    queryKey: queryKeys.nutrition(recipeId),
    queryFn: () => api.ai.nutrition(recipeId),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const next = await api.ai.nutrition(recipeId, {refresh: true});
      queryClient.setQueryData(queryKeys.nutrition(recipeId), next);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.recipe(recipeId),
      });
      void queryClient.invalidateQueries({queryKey: queryKeys.recipeLists()});
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) {
    return <Text className="text-muted p-4">Estimating nutrition…</Text>;
  }
  if (!data) {
    return (
      <View className="p-4">
        <Text className="text-muted mb-3">Nutrition is not available yet.</Text>
        <Pressable
          className="rounded-lg bg-gray-900 px-3 py-2"
          onPress={() => {
            void handleRefresh();
          }}
          disabled={refreshing}
        >
          <Text className="text-center text-sm text-white">
            {refreshing ? 'Refreshing…' : 'Estimate nutrition'}
          </Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View className="p-4">
      <View className="mb-3 flex-row items-center justify-between gap-3">
        <Text
          className="
            text-sm font-semibold uppercase tracking-wide text-gray-500
          "
        >
          Per Serving
        </Text>
        <Pressable
          className="rounded-lg bg-gray-100 px-3 py-1.5"
          onPress={() => {
            void handleRefresh();
          }}
          disabled={refreshing || isFetching}
        >
          <Text className="text-sm text-gray-800">
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Text>
        </Pressable>
      </View>
      {nutritionTabRows(data).map(row => (
        <NutritionRow
          key={row.label}
          {...row}
        />
      ))}
      <Text className="text-muted mt-4 text-xs">{data.disclaimer}</Text>
    </View>
  );
};

if (__DEV__) {
  NutritionTab.demo = (({Frame}) => (
    <Frame>
      <NutritionTab recipeId={makeRecipeDetail().id} />
    </Frame>
  )) satisfies ShowcaseDemoRenderer;
}

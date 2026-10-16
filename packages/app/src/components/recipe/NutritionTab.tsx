import {
  makeRecipeDetail,
  nutritionTabRows,
  queryKeys,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import {Button as DsButton, Text as DsText, tokens} from '@spudly/ui';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import React, {useState} from 'react';
import {XStack, YStack} from 'tamagui';

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
  <XStack
    justifyContent="space-between"
    borderBottomWidth={1}
    borderBottomColor={tokens.colors.gray.gray2}
    paddingVertical="$3"
  >
    <DsText
      fontSize={tokens.typography.fontSize.md}
      color={tokens.colors.gray.gray8}
    >
      {label}
    </DsText>
    <DsText
      fontSize={tokens.typography.fontSize.md}
      fontWeight={tokens.typography.fontWeight.semibold}
      color={tokens.colors.gray.gray10}
    >
      {value}
      {unit}
    </DsText>
  </XStack>
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
    return (
      <DsText
        color="$textMuted"
        padding="$4"
      >
        Estimating nutrition…
      </DsText>
    );
  }
  if (!data) {
    return (
      <YStack padding="$4">
        <DsText
          color="$textMuted"
          marginBlockEnd="$3"
        >
          Nutrition is not available yet.
        </DsText>
        <DsButton
          variant="secondary"
          backgroundColor={tokens.colors.gray.gray10}
          color={tokens.colors.gray.gray1}
          onPress={() => {
            void handleRefresh();
          }}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing…' : 'Estimate nutrition'}
        </DsButton>
      </YStack>
    );
  }
  return (
    <YStack padding="$4">
      <XStack
        marginBlockEnd="$3"
        alignItems="center"
        justifyContent="space-between"
        gap="$3"
      >
        <DsText
          fontSize={tokens.typography.fontSize.sm}
          fontWeight={tokens.typography.fontWeight.semibold}
          letterSpacing={0.35}
          color={tokens.colors.gray.gray6}
          textTransform="uppercase"
        >
          Per Serving
        </DsText>
        <DsButton
          variant="secondary"
          size="sm"
          backgroundColor={tokens.colors.gray.gray2}
          color={tokens.colors.gray.gray9}
          onPress={() => {
            void handleRefresh();
          }}
          disabled={refreshing || isFetching}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </DsButton>
      </XStack>
      {nutritionTabRows(data).map(row => (
        <NutritionRow
          key={row.label}
          {...row}
        />
      ))}
      <DsText
        fontSize={tokens.typography.fontSize.xs}
        color="$textMuted"
        marginBlockStart="$4"
      >
        {data.disclaimer}
      </DsText>
    </YStack>
  );
};

if (__DEV__) {
  NutritionTab.demo = (({Frame}) => (
    <Frame>
      <NutritionTab recipeId={makeRecipeDetail().id} />
    </Frame>
  )) satisfies ShowcaseDemoRenderer;
}

import {
  invalidateRecipeQueries,
  makeRecipeDetail,
  queryKeys,
  VERSION_ID,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import {Button as DsButton, Text as DsText, tokens} from '@spudly/ui';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import React, {useState} from 'react';
import {Text} from 'react-native';
import {XStack, YStack} from 'tamagui';
import type {CookLogInput} from '@eciperay/types';

import {api} from '../../lib/api';
import {CookLogForm} from '../cooking/CookLogForm';
import {BookLoadingSpinner} from '../ui/BookLoadingSpinner';

type Props = {recipeId: string; versionId: string};

const StarDisplay = ({rating}: {rating: number}) => (
  <Text accessibilityLabel={`${rating} stars`}>{'★'.repeat(rating)}</Text>
);

export const CookHistoryTab = ({recipeId, versionId}: Props) => {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const {data: cookLogs = [], isLoading} = useQuery({
    queryKey: queryKeys.cookLogs(recipeId, versionId),
    queryFn: () => api.cookLogs.list(recipeId, versionId),
  });

  const createMutation = useMutation({
    mutationFn: (input: CookLogInput) =>
      api.cookLogs.create(recipeId, versionId, input),
    onSuccess: async () => {
      await invalidateRecipeQueries(queryClient, recipeId, versionId);
      setShowForm(false);
    },
  });

  if (isLoading) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        padding="$4"
      >
        <BookLoadingSpinner size="sm" />
      </YStack>
    );
  }

  return (
    <YStack padding="$4">
      {showForm ? (
        <YStack marginBlockEnd="$4">
          <CookLogForm
            variant="light"
            secondaryLabel="Cancel"
            isPending={createMutation.isPending}
            onSkip={() => {
              setShowForm(false);
            }}
            onSubmit={input => {
              createMutation.mutate(input);
            }}
          />
        </YStack>
      ) : (
        <DsButton
          variant="primary"
          size="sm"
          alignSelf="flex-start"
          marginBlockEnd="$4"
          onPress={() => {
            setShowForm(true);
          }}
        >
          Log a cook
        </DsButton>
      )}
      {cookLogs.length === 0 ? (
        <DsText variant="hint">
          No cooks logged yet. Log a cook here or finish a cooking session to
          record feedback for this version.
        </DsText>
      ) : (
        cookLogs.map(log => (
          <YStack
            key={log.id}
            marginBlockEnd="$4"
            borderRadius={tokens.radii.md}
            borderWidth={1}
            borderColor={tokens.colors.gray.gray2}
            backgroundColor={tokens.colors.gray.gray1}
            padding="$4"
          >
            <XStack
              marginBlockEnd="$1"
              alignItems="center"
              justifyContent="space-between"
              gap="$2"
            >
              <DsText
                fontSize={tokens.typography.fontSize.sm}
                fontWeight={tokens.typography.fontWeight.medium}
                color={tokens.colors.gray.gray10}
              >
                {new Date(log.cookedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </DsText>
              {log.authorStarRating ? (
                <StarDisplay rating={log.authorStarRating} />
              ) : null}
            </XStack>
            {log.notes ? (
              <DsText
                fontSize={tokens.typography.fontSize.sm}
                color={tokens.colors.gray.gray8}
              >
                {log.notes}
              </DsText>
            ) : null}
          </YStack>
        ))
      )}
    </YStack>
  );
};

if (__DEV__) {
  const cookHistoryTabDemo: ShowcaseDemoRenderer = ({Frame}) => {
    const recipe = makeRecipeDetail();
    return (
      <Frame>
        <CookHistoryTab
          recipeId={recipe.id}
          versionId={VERSION_ID}
        />
      </Frame>
    );
  };
  CookHistoryTab.demo = cookHistoryTabDemo;
}

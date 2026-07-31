import {
  invalidateRecipeQueries,
  makeRecipeDetail,
  queryKeys,
  VERSION_ID,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import React, {useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import type {CookLogInput} from '@eciperay/types';

import {CookLogForm} from '../cooking/CookLogForm';
import {api} from '../../lib/api';

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
      <View className="p-4">
        <Text className="text-muted text-sm">Loading cook history…</Text>
      </View>
    );
  }

  return (
    <View className="p-4">
      {showForm ? (
        <View className="mb-4">
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
        </View>
      ) : (
        <TouchableOpacity
          className="bg-primary mb-4 self-start rounded-lg px-4 py-2"
          onPress={() => {
            setShowForm(true);
          }}
        >
          <Text className="text-sm font-medium text-white">Log a cook</Text>
        </TouchableOpacity>
      )}
      {cookLogs.length === 0 ? (
        <Text className="text-muted text-sm">
          No cooks logged yet. Log a cook here or finish a cooking session to
          record feedback for this version.
        </Text>
      ) : (
        cookLogs.map(log => (
          <View
            key={log.id}
            className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-4"
          >
            <View className="mb-1 flex-row items-center justify-between gap-2">
              <Text className="text-sm font-medium text-gray-900">
                {new Date(log.cookedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              {log.authorStarRating ? (
                <StarDisplay rating={log.authorStarRating} />
              ) : null}
            </View>
            {log.notes ? (
              <Text className="text-sm text-gray-700">{log.notes}</Text>
            ) : null}
          </View>
        ))
      )}
    </View>
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

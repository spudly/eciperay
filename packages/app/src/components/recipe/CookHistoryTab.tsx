import {queryKeys} from '@eciperay/client';
import {useQuery} from '@tanstack/react-query';
import React from 'react';
import {Text, View} from 'react-native';

import {api} from '../../lib/api';

type Props = {recipeId: string; versionId: string};

const StarDisplay = ({rating}: {rating: number}) => (
  <Text accessibilityLabel={`${rating} stars`}>{'★'.repeat(rating)}</Text>
);

export const CookHistoryTab = ({recipeId, versionId}: Props) => {
  const {data: cookLogs = [], isLoading} = useQuery({
    queryKey: queryKeys.cookLogs(recipeId, versionId),
    queryFn: () => api.cookLogs.list(recipeId, versionId),
  });

  if (isLoading) {
    return (
      <View className="p-4">
        <Text className="text-muted text-sm">Loading cook history…</Text>
      </View>
    );
  }

  if (cookLogs.length === 0) {
    return (
      <View className="p-4">
        <Text className="text-muted text-sm">
          No cooks logged yet. Finish a cooking session to record your first
          cook.
        </Text>
      </View>
    );
  }

  return (
    <View className="p-4">
      {cookLogs.map(log => (
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
      ))}
    </View>
  );
};

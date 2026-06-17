import {invalidateRecipeQueries, queryKeys} from '@eciperay/client';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import type {RecipeDraft} from '@eciperay/types';

import {api} from '../../lib/api';

type Props = {recipeId: string; draft: RecipeDraft};

export const DraftReviewCard = ({recipeId, draft}: Props) => {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await invalidateRecipeQueries(queryClient, recipeId);
  };

  const approve = useMutation({
    mutationFn: () => api.drafts.approve(recipeId, draft.id),
    onSuccess: () => {
      void invalidate();
    },
  });

  const reject = useMutation({
    mutationFn: () => api.drafts.reject(recipeId, draft.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.drafts(recipeId),
      });
    },
  });

  return (
    <View className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
      <Text className="mb-1 text-sm font-semibold text-indigo-900">
        AI Draft
      </Text>
      <Text className="mb-3 text-sm text-gray-800">
        {draft.summaryOfChanges}
      </Text>
      <View className="flex-row gap-2">
        <TouchableOpacity
          className="
            bg-primary rounded-lg px-4 py-2
            disabled:opacity-50
          "
          disabled={approve.isPending}
          onPress={() => {
            approve.mutate();
          }}
        >
          <Text className="text-sm font-medium text-white">Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="
            rounded-lg bg-gray-200 px-4 py-2
            disabled:opacity-50
          "
          disabled={reject.isPending}
          onPress={() => {
            reject.mutate();
          }}
        >
          <Text className="text-sm font-medium text-gray-700">Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

import {invalidateRecipeQueries, truncateChangeSummary} from '@eciperay/client';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import type {RecipeDetail, RecipeVersionSummary} from '@eciperay/types';
import clsx from 'clsx';
import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import {api} from '../../lib/api';

type Props = {
  recipe: RecipeDetail;
  versions: RecipeVersionSummary[];
  onActionMessage: (message: string) => void;
  onTweakAi: () => void;
  onViewVersion: (versionId: string) => void;
};

export const OverviewActions = ({
  recipe,
  versions,
  onActionMessage,
  onTweakAi,
  onViewVersion,
}: Props) => {
  const queryClient = useQueryClient();

  const isEditable =
    recipe.lifecycleStatus !== 'perfected' &&
    recipe.lifecycleStatus !== 'abandoned';

  const candidates = versions.filter(v => v.derivedRole === 'candidate');

  const invalidate = () =>
    invalidateRecipeQueries(queryClient, recipe.id, recipe.versionId);

  const lifecycleMutation = useMutation({
    mutationFn: (status: RecipeDetail['lifecycleStatus']) =>
      api.recipes.patchLifecycle(recipe.id, status),
    onSuccess: () => {
      void invalidate();
    },
  });

  const activateMutation = useMutation({
    mutationFn: (versionId: string) =>
      api.versions.activate(recipe.id, versionId),
    onSuccess: () => {
      void invalidate();
      onActionMessage('Version activated');
    },
  });

  const tweakManualMutation = useMutation({
    mutationFn: () => api.versions.create(recipe.id),
    onSuccess: version => {
      void invalidate();
      onViewVersion(version.id);
    },
  });

  if (!isEditable && candidates.length === 0) {
    return null;
  }

  return (
    <>
      {isEditable ? (
        <View className="mb-4 flex-row flex-wrap gap-2">
          <TouchableOpacity
            className="rounded-lg border border-gray-200 px-3 py-2"
            disabled={tweakManualMutation.isPending}
            onPress={() => {
              tweakManualMutation.mutate();
            }}
          >
            <Text className="text-sm font-medium text-gray-700">
              Tweak manually
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="
              rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2
            "
            onPress={onTweakAi}
          >
            <Text className="text-sm font-medium text-indigo-800">
              Tweak with AI
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="rounded-lg bg-green-100 px-3 py-2"
            disabled={lifecycleMutation.isPending}
            onPress={() => {
              lifecycleMutation.mutate('perfected');
            }}
          >
            <Text className="text-sm font-medium text-green-800">
              Mark perfected
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="rounded-lg bg-red-100 px-3 py-2"
            disabled={lifecycleMutation.isPending}
            onPress={() => {
              lifecycleMutation.mutate('abandoned');
            }}
          >
            <Text className="text-sm font-medium text-red-800">Abandon</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {candidates.length > 0 ? (
        <View className="mb-4 gap-2">
          <Text className="text-sm font-medium text-gray-900">
            Ready to activate
          </Text>
          {candidates.map(version => (
            <View
              key={version.id}
              className="rounded-lg border border-indigo-200 bg-indigo-50 p-3"
            >
              <Text className="mb-2 text-sm text-gray-800">
                v{version.versionNumber}
                {version.changeSummary
                  ? `: ${truncateChangeSummary(version.changeSummary)}`
                  : ''}
              </Text>
              <TouchableOpacity
                className={clsx(
                  'bg-primary self-start rounded-lg px-4 py-2',
                  activateMutation.isPending ? 'opacity-50' : '',
                )}
                disabled={activateMutation.isPending}
                onPress={() => {
                  activateMutation.mutate(version.id);
                }}
              >
                <Text className="text-sm font-medium text-white">Activate</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
};

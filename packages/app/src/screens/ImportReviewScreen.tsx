import {errorMessage, queryKeys, recipeDetailToInput} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import React from 'react';
import {Image, Text, TouchableOpacity, View} from 'react-native';

import {RecipeInputPreview} from '../components/recipe/RecipeInputPreview';
import {api} from '../lib/api';
import type {AddStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<AddStackParamList, 'ImportReview'>;

export const ImportReviewScreen = ({route, navigation}: Props) => {
  const {recipeId} = route.params;
  const queryClient = useQueryClient();

  const {data: recipe, isLoading} = useQuery({
    queryKey: queryKeys.recipe(recipeId),
    queryFn: () => api.recipes.get(recipeId),
    enabled: recipeId.length > 0,
  });

  const acceptMutation = useMutation({
    mutationFn: () => api.recipes.acceptImport(recipeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.recipe(recipeId),
      });
      navigation
        .getParent()
        ?.navigate('Recipes', {screen: 'RecipeDetail', params: {recipeId}});
    },
  });

  const startEditsMutation = useMutation({
    mutationFn: () => api.versions.startImportEdits(recipeId),
    onSuccess: async version => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.recipe(recipeId),
      });
      navigation
        .getParent()
        ?.navigate('Recipes', {
          screen: 'EditVersion',
          params: {recipeId, versionId: version.id},
        });
    },
  });

  const busy = acceptMutation.isPending || startEditsMutation.isPending;
  const error =
    acceptMutation.error || startEditsMutation.error
      ? errorMessage(acceptMutation.error ?? startEditsMutation.error)
      : null;

  if (isLoading || !recipe) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Loading…</Text>
      </View>
    );
  }

  const preview = recipeDetailToInput(recipe);
  const versionLabel = recipe.versionNumber ? `v${recipe.versionNumber}` : 'v1';

  return (
    <View className="flex-1 bg-gray-50 px-4 pt-4">
      <Text className="mb-2 text-2xl font-bold text-gray-900">
        Review Import
      </Text>
      <Text className="text-muted mb-4 text-sm">
        This is your imported recipe ({versionLabel}). Looks good, or make edits
        to create a draft version.
      </Text>
      {recipe.imageUrl ? (
        <Image
          source={{uri: recipe.imageUrl}}
          className="mb-4 h-48 w-full rounded-xl"
          resizeMode="cover"
        />
      ) : null}
      <View className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <RecipeInputPreview recipe={preview} />
      </View>
      {error ? (
        <Text className="mb-4 text-sm text-red-600">{error}</Text>
      ) : null}
      <View className="flex-row flex-wrap gap-3">
        <TouchableOpacity
          className="
            bg-primary rounded-lg px-4 py-3
            disabled:opacity-50
          "
          disabled={busy}
          onPress={() => {
            acceptMutation.mutate();
          }}
        >
          <Text className="text-sm font-semibold text-white">
            {acceptMutation.isPending ? 'Saving…' : 'Looks good'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="
            rounded-lg border border-gray-200 px-4 py-3
            disabled:opacity-50
          "
          disabled={busy}
          onPress={() => {
            startEditsMutation.mutate();
          }}
        >
          <Text className="text-sm font-medium text-gray-700">
            {startEditsMutation.isPending ? 'Creating draft…' : 'Make edits'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

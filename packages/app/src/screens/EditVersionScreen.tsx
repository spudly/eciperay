import {
  invalidateRecipeQueries,
  queryKeys,
  recipeVersionDetailToInput,
} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import type {RecipeVersionInput} from '@eciperay/types';

import {RecipeForm} from '../components/recipe/RecipeForm';
import {api} from '../lib/api';
import type {RecipesStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RecipesStackParamList, 'EditVersion'>;

export const EditVersionScreen = ({route, navigation}: Props) => {
  const {recipeId, versionId} = route.params;
  const queryClient = useQueryClient();

  const {data: version, isLoading} = useQuery({
    queryKey: queryKeys.version(recipeId, versionId),
    queryFn: () => api.versions.get(recipeId, versionId),
    enabled: recipeId.length > 0 && versionId.length > 0,
  });

  const handleSubmit = async (input: RecipeVersionInput) => {
    await api.versions.put(recipeId, versionId, input);
    await invalidateRecipeQueries(queryClient, recipeId, versionId);
    navigation.navigate('RecipeDetail', {recipeId});
  };

  if (isLoading || !version) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Loading…</Text>
      </View>
    );
  }

  if (version.derivedRole !== 'draft') {
    return (
      <View className="flex-1 bg-gray-50 px-4 pt-4">
        <Text className="text-red-600">
          Only draft versions can be edited here.
        </Text>
        <TouchableOpacity
          className="mt-4"
          onPress={() => {
            navigation.navigate('RecipeDetail', {recipeId});
          }}
        >
          <Text className="text-primary text-sm underline">Back to recipe</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 px-4 pt-4">
      <Text className="mb-2 text-2xl font-bold text-gray-900">
        Edit Draft (v{version.versionNumber})
      </Text>
      {version.changeSummary ? (
        <Text className="text-muted mb-6 text-sm">{version.changeSummary}</Text>
      ) : null}
      <RecipeForm
        initial={recipeVersionDetailToInput(version)}
        recipeId={recipeId}
        submitLabel="Save Draft"
        onSubmit={handleSubmit}
      />
    </View>
  );
};

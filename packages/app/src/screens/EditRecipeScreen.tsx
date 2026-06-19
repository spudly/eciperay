import {
  invalidateRecipeQueries,
  queryKeys,
  recipeDetailToInput,
} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import React from 'react';
import {Text, View} from 'react-native';
import type {RecipeInput} from '@eciperay/types';

import {RecipeForm} from '../components/recipe/RecipeForm';
import {api} from '../lib/api';
import type {RecipesStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RecipesStackParamList, 'EditRecipe'>;

export const EditRecipeScreen = ({route, navigation}: Props) => {
  const {recipeId} = route.params;
  const queryClient = useQueryClient();

  const {data: recipe, isLoading} = useQuery({
    queryKey: queryKeys.recipe(recipeId),
    queryFn: () => api.recipes.get(recipeId),
    enabled: recipeId.length > 0,
  });

  const handleSubmit = async (input: RecipeInput) => {
    await api.recipes.put(recipeId, input);
    await invalidateRecipeQueries(queryClient, recipeId, recipe?.versionId);
    navigation.navigate('RecipeDetail', {recipeId});
  };

  if (isLoading || !recipe) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Loading…</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 px-4 pt-4">
      <Text className="mb-4 text-2xl font-bold text-gray-900">Edit Recipe</Text>
      <RecipeForm
        initial={recipeDetailToInput(recipe)}
        recipeId={recipeId}
        submitLabel="Save Changes"
        onSubmit={handleSubmit}
      />
    </View>
  );
};

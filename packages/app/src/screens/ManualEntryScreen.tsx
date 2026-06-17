import {
  invalidateRecipeQueries,
  uploadRecipeImageFromBase64,
  useAuth,
} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useQueryClient} from '@tanstack/react-query';
import React from 'react';
import {Text, View} from 'react-native';
import type {RecipeInput} from '@eciperay/types';

import {RecipeForm} from '../components/recipe/RecipeForm';
import type {PendingRecipeImage} from '../lib/recipeImageAsset';
import {api} from '../lib/api';
import {supabase} from '../lib/supabase';
import type {AddStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<AddStackParamList, 'ManualEntry'>;

const emptyInput: RecipeInput = {
  title: '',
  servings: 4,
  ingredients: [],
  instructions: [],
  tagIds: [],
};

export const ManualEntryScreen = ({navigation}: Props) => {
  const queryClient = useQueryClient();
  const {session} = useAuth();

  const handleSubmit = async (
    input: RecipeInput,
    pendingImage?: PendingRecipeImage,
  ) => {
    const recipe = await api.recipes.create(input);
    if (pendingImage && session?.user.id) {
      const imageUrl = await uploadRecipeImageFromBase64(
        supabase,
        pendingImage.base64,
        pendingImage.contentType,
        {userId: session.user.id, recipeId: recipe.id},
      );
      await api.recipes.patch(recipe.id, {imageUrl});
    }
    await invalidateRecipeQueries(queryClient, recipe.id);
    navigation
      .getParent()
      ?.navigate('Recipes', {
        screen: 'RecipeDetail',
        params: {recipeId: recipe.id},
      });
  };

  return (
    <View className="flex-1 bg-gray-50 px-4 pt-4">
      <Text className="mb-4 text-2xl font-bold text-gray-900">
        Manual Entry
      </Text>
      <RecipeForm
        initial={emptyInput}
        submitLabel="Create Recipe"
        onSubmit={handleSubmit}
      />
    </View>
  );
};

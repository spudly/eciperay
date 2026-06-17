import {invalidateRecipeQueries} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useQueryClient} from '@tanstack/react-query';
import React from 'react';
import {Text, View} from 'react-native';
import type {RecipeInput} from '@eciperay/types';

import {RecipeForm} from '../components/recipe/RecipeForm';
import {api} from '../lib/api';
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

  const handleSubmit = async (input: RecipeInput) => {
    const recipe = await api.recipes.create(input);
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

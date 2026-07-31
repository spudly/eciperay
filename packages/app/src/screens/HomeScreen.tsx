import {
  HOME_ADD_LABEL,
  HOME_BROWSE_LABEL,
  HOME_EMPTY_MESSAGE,
  HOME_RECIPES_SECTION_TITLE,
  HOME_SHARED_WITH_ME_LABEL,
  HOME_SUBTITLE,
  HOME_TITLE,
  homeRecentlyViewedRecipesQueryOptions,
  queryKeys,
  removeRecipeView,
} from '@eciperay/client';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {useFocusEffect} from '@react-navigation/native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import React, {useCallback} from 'react';
import {Alert, ScrollView, Text, TouchableOpacity, View} from 'react-native';
import type {RecipeDetail} from '@eciperay/types';

import {RecipeListCard} from '../components/RecipeListCard';
import {api} from '../lib/api';
import {recipeViewHistoryStorage} from '../lib/recipeViewHistoryStorage';
import type {RootTabParamList} from '../navigation/types';

type Props = BottomTabScreenProps<RootTabParamList, 'Home'>;

export const HomeScreen = ({navigation}: Props) => {
  const queryClient = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.recipes('home-recently-viewed'),
      });
    }, [queryClient]),
  );

  const {data: recipes = [], isLoading} = useQuery(
    homeRecentlyViewedRecipesQueryOptions(
      id => api.recipes.get(id),
      recipeViewHistoryStorage,
    ),
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.recipes.delete(id);
      await removeRecipeView(recipeViewHistoryStorage, id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.recipes('home-recently-viewed'),
      });
    },
  });

  const confirmDelete = (recipe: RecipeDetail) => {
    Alert.alert('Delete recipe', `Delete "${recipe.title}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteMutation.mutate(recipe.id);
        },
      },
    ]);
  };

  const openRecipe = (recipeId: string) => {
    navigation.navigate('Recipes', {
      screen: 'RecipeDetail',
      params: {recipeId},
    });
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-4 pt-6">
        <Text className="mb-2 text-center text-2xl font-bold text-gray-900">
          {HOME_TITLE}
        </Text>
        <Text className="text-muted mb-6 text-center">{HOME_SUBTITLE}</Text>
        <View className="mb-8 gap-3">
          <TouchableOpacity
            className="bg-primary items-center rounded-xl px-4 py-3"
            onPress={() => {
              navigation.navigate('Recipes', {screen: 'RecipesList'});
            }}
          >
            <Text className="font-semibold text-white">
              {HOME_BROWSE_LABEL}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="items-center rounded-xl bg-gray-100 px-4 py-3"
            onPress={() => {
              navigation.navigate('Add', {screen: 'AddScreen'});
            }}
          >
            <Text className="font-semibold text-gray-700">
              {HOME_ADD_LABEL}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="items-center rounded-xl bg-gray-100 px-4 py-3"
            onPress={() => {
              navigation.navigate('Recipes', {screen: 'SharedWithMe'});
            }}
          >
            <Text className="font-semibold text-gray-700">
              {HOME_SHARED_WITH_ME_LABEL}
            </Text>
          </TouchableOpacity>
        </View>
        <Text className="mb-4 text-xl font-bold text-gray-900">
          {HOME_RECIPES_SECTION_TITLE}
        </Text>
      </View>

      <View className="px-4 pb-8">
        {isLoading ? (
          <Text className="text-muted mt-8 text-center">Loading…</Text>
        ) : recipes.length === 0 ? (
          <Text className="text-muted text-center">{HOME_EMPTY_MESSAGE}</Text>
        ) : (
          recipes.map(recipe => (
            <RecipeListCard
              key={recipe.id}
              recipe={recipe}
              onPress={() => {
                openRecipe(recipe.id);
              }}
              onDelete={() => {
                confirmDelete(recipe);
              }}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
};

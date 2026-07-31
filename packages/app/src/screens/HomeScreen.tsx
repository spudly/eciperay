import {
  homeRecentlyViewedRecipesQueryOptions,
  queryKeys,
  removeRecipeView,
} from '@eciperay/client';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {useFocusEffect} from '@react-navigation/native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useCallback} from 'react';
import {Alert} from 'react-native';
import type {RecipeDetail} from '@eciperay/types';

import {HomeView} from '../components/home/HomeView';
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
    <HomeView
      isLoading={isLoading}
      recipes={recipes}
      onBrowsePress={() => {
        navigation.navigate('Recipes', {screen: 'RecipesList'});
      }}
      onAddPress={() => {
        navigation.navigate('Add', {screen: 'AddScreen'});
      }}
      onSharedWithMePress={() => {
        navigation.navigate('Recipes', {screen: 'SharedWithMe'});
      }}
      onRecipePress={openRecipe}
      onRecipeDelete={confirmDelete}
    />
  );
};

import {
  invalidateRecipeQueries,
  recipeListInfiniteQueryOptions,
  useAnalytics,
} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {useDeferredValue, useState} from 'react';
import {Alert} from 'react-native';
import type {RecipeDetail} from '@eciperay/types';

import {RecipesListView} from '../components/recipes/RecipesListView';
import {api} from '../lib/api';
import type {RecipesStackParamList} from '../navigation/types';

type RecipesProps = NativeStackScreenProps<
  RecipesStackParamList,
  'RecipesList'
>;

export const RecipesScreen = ({navigation}: RecipesProps) => {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const queryClient = useQueryClient();
  const analytics = useAnalytics();

  const {data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} =
    useInfiniteQuery(
      recipeListInfiniteQueryOptions(
        params => api.recipes.list(params),
        deferredSearch,
      ),
    );

  const recipes = data?.pages.flat() ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.recipes.delete(id),
    onSuccess: (_data, id) => {
      analytics.track('recipe_deleted', {recipe_id: id});
      void invalidateRecipeQueries(queryClient, id);
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

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  return (
    <RecipesListView
      search={search}
      onSearchChange={setSearch}
      isLoading={isLoading}
      recipes={recipes}
      isFetchingNextPage={isFetchingNextPage}
      onRecipePress={recipeId => {
        navigation.navigate('RecipeDetail', {recipeId});
      }}
      onRecipeDelete={confirmDelete}
      onLoadMore={loadMore}
    />
  );
};

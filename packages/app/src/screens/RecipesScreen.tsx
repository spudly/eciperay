import {
  recipeListInfiniteQueryOptions,
  useRecipeListFilters,
} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useInfiniteQuery} from '@tanstack/react-query';

import {RecipesListView} from '../hosts/recipes/RecipesListView';
import {api} from '../lib/api';
import type {RecipesStackParamList} from '../navigation/types';

type RecipesProps = NativeStackScreenProps<
  RecipesStackParamList,
  'RecipesList'
>;

// No delete wiring lives here anymore: @spudly/ui 1.8.0 removed the
// list row's Delete action (and its `onRecipeDelete` prop), so deleting
// a recipe happens on the recipe detail screen, which already exposes
// it through RecipeDetailPage's `onDeletePress`.
export const RecipesScreen = ({navigation}: RecipesProps) => {
  const {filters, controls} = useRecipeListFilters();

  const {data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} =
    useInfiniteQuery(
      recipeListInfiniteQueryOptions(
        params => api.recipes.list(params),
        filters,
      ),
    );

  const recipes = data?.pages.flat() ?? [];

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  return (
    <RecipesListView
      {...controls}
      isLoading={isLoading}
      recipes={recipes}
      isFetchingNextPage={isFetchingNextPage}
      onRecipePress={recipeId => {
        navigation.navigate('RecipeDetail', {recipeId});
      }}
      onLoadMore={loadMore}
    />
  );
};

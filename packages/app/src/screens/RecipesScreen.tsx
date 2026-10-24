import {
  invalidateRecipeQueries,
  recipeListInfiniteQueryOptions,
  useAnalytics,
  useRecipeListFilters,
} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {Alert} from 'react-native';
import type {RecipeDetail} from '@eciperay/types';

import {RecipesListView} from '../components/recipes/RecipesListView';
import {EXP_RECIPES} from '../experiment205/DiagHarness';
import {api} from '../lib/api';
import {EXP205_FIXTURES} from '../lib/env';
import type {RecipesStackParamList} from '../navigation/types';

type RecipesProps = NativeStackScreenProps<
  RecipesStackParamList,
  'RecipesList'
>;

// EXPERIMENT ONLY (#205 diagnosis, throwaway branch): when the bundle
// is built with EXP205_FIXTURES=1 (the emulator workflow does), the
// screen serves fixture rows instead of API data, so the real screen
// renders real rows inside the real navigation chrome without an
// authenticated session. Everywhere else the query path is untouched.

export const RecipesScreen = ({navigation}: RecipesProps) => {
  const {filters, controls} = useRecipeListFilters();
  const queryClient = useQueryClient();
  const analytics = useAnalytics();

  const query = useInfiniteQuery(
    recipeListInfiniteQueryOptions(params => api.recipes.list(params), filters),
  );

  const isLoading = EXP205_FIXTURES ? false : query.isLoading;
  const isFetchingNextPage = EXP205_FIXTURES ? false : query.isFetchingNextPage;
  const hasNextPage = EXP205_FIXTURES ? false : query.hasNextPage;
  const fetchNextPage = EXP205_FIXTURES ? () => undefined : query.fetchNextPage;
  const recipes = EXP205_FIXTURES
    ? EXP_RECIPES
    : (query.data?.pages.flat() ?? []);

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
      {...controls}
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

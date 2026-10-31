import {
  recipeListInfiniteQueryOptions,
  useRecipeListFilters,
} from '@eciperay/client';
import {useInfiniteQuery} from '@tanstack/react-query';

import {RecipesListView} from '../hosts/recipes/RecipesListView';
import {api} from '../lib/api';

// No delete wiring lives here anymore: @spudly/ui 1.8.0 removed the
// list row's Delete action (and its `onRecipeDelete` prop), so deleting
// a recipe happens on the recipe detail screen, which already exposes
// it through RecipeDetailPage's `onDeletePress`. Row navigation needs
// no wiring either since 1.15.0: the rows are links carrying their
// deep-link hrefs (#248), so this screen no longer takes a navigation
// prop.
export const RecipesScreen = () => {
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
      onLoadMore={loadMore}
    />
  );
};

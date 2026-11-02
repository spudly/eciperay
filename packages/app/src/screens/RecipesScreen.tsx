import {
  recipeListInfiniteQueryOptions,
  useRecipeListFilters,
} from '@eciperay/client';
import {Alert, tokens} from '@spudly/ui';
import {useInfiniteQuery} from '@tanstack/react-query';
import {View} from 'react-native';

import {RecipesListView} from '../hosts/recipes/RecipesListView';
import {api} from '../lib/api';

const loadMoreErrorContainerStyle = {
  paddingHorizontal: tokens.spacing[4],
  paddingVertical: tokens.spacing[3],
} as const;

// No delete wiring lives here anymore: @spudly/ui 1.8.0 removed the
// list row's Delete action (and its `onRecipeDelete` prop), so deleting
// a recipe happens on the recipe detail screen, which already exposes
// it through RecipeDetailPage's `onDeletePress`. Row navigation needs
// no wiring either since 1.15.0: the rows are links carrying their
// deep-link hrefs (#248), so this screen no longer takes a navigation
// prop.
export const RecipesScreen = () => {
  const {filters, controls} = useRecipeListFilters();

  const {
    data,
    isLoading,
    isFetchingNextPage,
    isFetchNextPageError,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery(
    recipeListInfiniteQueryOptions(params => api.recipes.list(params), filters),
  );

  const recipes = data?.pages.flat() ?? [];

  // The shared pagination pattern re-fires onLoadMore when a fetch
  // completes having added no rows (design-system#285) — it cannot
  // tell an empty page from a failed one, so the screen gates here: a
  // failed next page latches isFetchNextPageError, automatic loading
  // stops instead of cycling retries, and the alert under the list
  // offers the manual retry (#371, mirroring the web hosts in #319).
  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  };

  return (
    <>
      <RecipesListView
        {...controls}
        isLoading={isLoading}
        recipes={recipes}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={loadMore}
      />
      {isFetchNextPageError ? (
        <View style={loadMoreErrorContainerStyle}>
          <Alert
            severity="error"
            message="Couldn't load more recipes."
            actions={[
              {
                label: 'Try again',
                onPress: () => {
                  void fetchNextPage();
                },
              },
            ]}
          />
        </View>
      ) : null}
    </>
  );
};

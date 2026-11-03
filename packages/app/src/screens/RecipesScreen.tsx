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

// The list host must be bounded inside this column: RecipesPage's
// ScreenContainer is a non-scrollable shell with flex: 1 and
// minHeight: "100%", so as a direct sibling it takes the full screen
// height and pushes the error alert below the viewport, where list
// scrolling cannot reveal it. The flex: 1 wrapper reserves the
// remaining space for the list and lets the alert take its own height
// underneath it, inside the viewport.
const screenStyle = {flex: 1} as const;

const listContainerStyle = {flex: 1} as const;

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
    <View style={screenStyle}>
      <View style={listContainerStyle}>
        <RecipesListView
          {...controls}
          isLoading={isLoading}
          recipes={recipes}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={loadMore}
        />
      </View>
      {isFetchNextPageError ? (
        <View style={loadMoreErrorContainerStyle}>
          <Alert
            severity="error"
            message="Couldn't load more recipes."
            actions={[
              {
                label: 'Try again',
                onPress: () => {
                  // The error stays latched while a retry is in
                  // flight, so this action stays tappable during it:
                  // cancelRefetch: false reuses the in-flight retry
                  // instead of cancelling and restarting it with a
                  // duplicate request.
                  void fetchNextPage({cancelRefetch: false});
                },
              },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
};

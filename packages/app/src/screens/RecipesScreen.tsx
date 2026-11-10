import {
  DISCOVER_ERROR_MESSAGE,
  publicRecipeDiscoveryInfiniteQueryOptions,
  recipeListInfiniteQueryOptions,
  sharedWithMeInfiniteQueryOptions,
  useRecipeListFilters,
} from '@eciperay/client';
import {useInfiniteQuery} from '@tanstack/react-query';
import {useCallback} from 'react';
import {View} from 'react-native';

import {RecipesListView} from '../hosts/recipes/RecipesListView';
import {api} from '../lib/api';

// The list host must be bounded inside this column: RecipesPage's
// ScreenContainer is a non-scrollable shell with flex: 1 and
// minHeight: "100%", so the flex: 1 wrapper reserves the screen's
// space for the list.
const screenStyle = {flex: 1} as const;

// No delete wiring lives here anymore: @spudly/ui 1.8.0 removed the
// list row's Delete action (and its `onRecipeDelete` prop), so deleting
// a recipe happens on the recipe detail screen, which already exposes
// it through RecipeDetailPage's `onDeletePress`. Row navigation needs
// no wiring either since 1.15.0: the rows are links carrying their
// deep-link hrefs (#248), so this screen no longer takes a navigation
// prop.
//
// The unified browse (#412, mirroring the web host in #409): this
// screen drives the page's three infinite queries — the user's own
// recipes, the recipes shared with them, and the public discovery
// catalog — all from the one `useRecipeListFilters` state, so the
// page's single search / filter bar governs every section. There is
// no shell header search on native (Stephen's Option A): the page's
// own search field is the only search surface.
export const RecipesScreen = () => {
  const {filters, controls} = useRecipeListFilters();

  const ownQuery = useInfiniteQuery(
    recipeListInfiniteQueryOptions(params => api.recipes.list(params), filters),
  );
  const sharedQuery = useInfiniteQuery(
    sharedWithMeInfiniteQueryOptions(
      params => api.recipes.listSharedWithMe(params),
      filters,
    ),
  );
  const discoveryQuery = useInfiniteQuery(
    publicRecipeDiscoveryInfiniteQueryOptions(
      params => api.recipes.listPublic(params),
      filters,
    ),
  );

  const recipes = ownQuery.data?.pages.flat() ?? [];
  const sharedRecipes = sharedQuery.data?.pages.flat() ?? [];
  const discoveryRecipes = discoveryQuery.data?.pages.flat() ?? [];

  // A failed FIRST page is not a load-more failure and not an empty
  // list: with no rows loaded the page would otherwise render its
  // empty state for what is actually an error. It crosses through the
  // host as the own section's first-load error (`ownErrorMessage`);
  // once any rows are loaded, a failure is the load-more path instead.
  // The two own-section queries fail independently — either one's
  // failure surfaces, and neither hides the discovery section
  // (mirroring the web host's composition).
  const ownSectionFailed = ownQuery.isError || sharedQuery.isError;
  const ownRowCount = recipes.length + sharedRecipes.length;
  const ownErrorMessage =
    ownSectionFailed && ownRowCount === 0
      ? "Couldn't load your recipes."
      : null;
  const loadMoreErrorMessage =
    ownQuery.isFetchNextPageError ||
    sharedQuery.isFetchNextPageError ||
    (ownSectionFailed && ownRowCount > 0)
      ? "Couldn't load more recipes."
      : null;

  const handleOwnLoadMoreRetry = useCallback(() => {
    // The error stays latched while a retry is in flight, so this
    // action stays tappable during it: cancelRefetch: false reuses
    // the in-flight retry instead of cancelling and restarting it
    // with a duplicate request. A first-page failure has no next
    // page to fetch, so it retries through refetch instead.
    if (ownQuery.isFetchNextPageError) {
      void ownQuery.fetchNextPage({cancelRefetch: false});
    } else if (ownQuery.isError) {
      void ownQuery.refetch();
    }
    if (sharedQuery.isFetchNextPageError) {
      void sharedQuery.fetchNextPage({cancelRefetch: false});
    } else if (sharedQuery.isError) {
      void sharedQuery.refetch();
    }
  }, [ownQuery, sharedQuery]);

  // The shared pagination pattern re-fires onLoadMore when a fetch
  // completes having added no rows (design-system#285) — it cannot
  // tell an empty page from a failed one, so the screen gates here:
  // each query continues only when it has a next page, is not already
  // fetching one, and has no latched next-page error; a failed next
  // page stops automatic loading for that query instead of cycling
  // retries, and the own section's load-more error row offers the
  // manual retry (#371, mirroring the web hosts in #319).
  const loadMore = useCallback(() => {
    if (
      ownQuery.hasNextPage &&
      !ownQuery.isFetchingNextPage &&
      !ownQuery.isFetchNextPageError
    ) {
      void ownQuery.fetchNextPage();
    }
    if (
      sharedQuery.hasNextPage &&
      !sharedQuery.isFetchingNextPage &&
      !sharedQuery.isFetchNextPageError
    ) {
      void sharedQuery.fetchNextPage();
    }
    if (
      discoveryQuery.hasNextPage &&
      !discoveryQuery.isFetchingNextPage &&
      !discoveryQuery.isFetchNextPageError
    ) {
      void discoveryQuery.fetchNextPage();
    }
  }, [ownQuery, sharedQuery, discoveryQuery]);

  return (
    <View style={screenStyle}>
      <RecipesListView
        {...controls}
        isLoading={ownQuery.isLoading || sharedQuery.isLoading}
        recipes={recipes}
        sharedRecipes={sharedRecipes}
        discoveryRecipes={discoveryRecipes}
        loadingDiscovery={discoveryQuery.isLoading}
        discoveryErrorMessage={
          discoveryQuery.isError && discoveryRecipes.length === 0
            ? DISCOVER_ERROR_MESSAGE
            : null
        }
        ownErrorMessage={ownErrorMessage}
        isFetchingNextOwnPage={
          ownQuery.isFetchingNextPage || sharedQuery.isFetchingNextPage
        }
        isFetchingNextPage={discoveryQuery.isFetchingNextPage}
        onLoadMore={loadMore}
        loadMoreErrorMessage={loadMoreErrorMessage}
        onLoadMoreRetry={handleOwnLoadMoreRetry}
      />
    </View>
  );
};

import {
  SHARED_WITH_ME_TITLE,
  sharedWithMeInfiniteQueryOptions,
  useRecipeListFilters,
} from '@eciperay/client';
import {useInfiniteQuery} from '@tanstack/react-query';
import {View} from 'react-native';

import {SharedWithMeView} from '../hosts/shared/SharedWithMeView';
import {api} from '../lib/api';

// The list host must be bounded inside this column: RecipesPage's
// ScreenContainer is a non-scrollable shell with flex: 1 and
// minHeight: "100%", so the flex: 1 wrapper reserves the screen's
// space for the list.
const screenStyle = {flex: 1} as const;

export const SharedWithMeScreen = () => {
  const {filters, controls} = useRecipeListFilters();
  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    isFetchNextPageError,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery(
    sharedWithMeInfiniteQueryOptions(
      params => api.recipes.listSharedWithMe(params),
      filters,
    ),
  );

  const recipes = data?.pages.flat() ?? [];

  // A failed FIRST page is not a load-more failure and not an empty
  // list: with no pages loaded the page would otherwise render its
  // empty state for what is actually an error. It crosses through the
  // host as the own section's first-load error (`ownErrorMessage`);
  // once any rows are loaded, a failure is the load-more path instead.
  const ownErrorMessage =
    isError && recipes.length === 0 ? "Couldn't load shared recipes." : null;

  // Same pagination-error gate as the Recipes screen: the shared
  // pagination pattern re-fires onLoadMore when a fetch adds no rows
  // and cannot tell an empty page from a failed one, so a failed next
  // page stops automatic loading here and the page's own-section
  // load-more error row offers the manual retry. Until @spudly/ui
  // 6.x the row was a DS Alert rendered under the list; the page's
  // error props carry it now.
  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  };

  return (
    <View style={screenStyle}>
      <SharedWithMeView
        {...controls}
        isLoading={isLoading}
        recipes={recipes}
        ownErrorMessage={ownErrorMessage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={loadMore}
        showTitle={false}
        loadMoreErrorMessage={
          isFetchNextPageError ? "Couldn't load more recipes." : null
        }
        onLoadMoreRetry={() => {
          // The error stays latched while a retry is in
          // flight, so this action stays tappable during it:
          // cancelRefetch: false reuses the in-flight retry
          // instead of cancelling and restarting it with a
          // duplicate request.
          void fetchNextPage({cancelRefetch: false});
        }}
      />
    </View>
  );
};

export const sharedWithMeScreenOptions = {title: SHARED_WITH_ME_TITLE};

import {
  SHARED_WITH_ME_TITLE,
  sharedWithMeInfiniteQueryOptions,
  useRecipeListFilters,
} from '@eciperay/client';
import {Alert, tokens} from '@spudly/ui';
import {useInfiniteQuery} from '@tanstack/react-query';
import {View} from 'react-native';

import {SharedWithMeView} from '../hosts/shared/SharedWithMeView';
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

export const SharedWithMeScreen = () => {
  const {filters, controls} = useRecipeListFilters();
  const {
    data,
    isLoading,
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

  // Same pagination-error gate as the Recipes screen: the shared
  // pagination pattern re-fires onLoadMore when a fetch adds no rows
  // and cannot tell an empty page from a failed one, so a failed next
  // page stops automatic loading here and the alert under the list
  // offers the manual retry (#371, mirroring the web hosts in #319).
  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  };

  return (
    <View style={screenStyle}>
      <View style={listContainerStyle}>
        <SharedWithMeView
          {...controls}
          isLoading={isLoading}
          recipes={recipes}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={loadMore}
          showTitle={false}
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

export const sharedWithMeScreenOptions = {title: SHARED_WITH_ME_TITLE};

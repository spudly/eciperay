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
    <>
      <SharedWithMeView
        {...controls}
        isLoading={isLoading}
        recipes={recipes}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={loadMore}
        showTitle={false}
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

export const sharedWithMeScreenOptions = {title: SHARED_WITH_ME_TITLE};

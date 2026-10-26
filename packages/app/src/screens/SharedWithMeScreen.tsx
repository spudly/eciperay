import {
  SHARED_WITH_ME_TITLE,
  sharedWithMeInfiniteQueryOptions,
  useRecipeListFilters,
} from '@eciperay/client';
import {useInfiniteQuery} from '@tanstack/react-query';

import {SharedWithMeView} from '../hosts/shared/SharedWithMeView';
import {api} from '../lib/api';

export const SharedWithMeScreen = () => {
  const {filters, controls} = useRecipeListFilters();
  const {data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} =
    useInfiniteQuery(
      sharedWithMeInfiniteQueryOptions(
        params => api.recipes.listSharedWithMe(params),
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
    <SharedWithMeView
      {...controls}
      isLoading={isLoading}
      recipes={recipes}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={loadMore}
      showTitle={false}
    />
  );
};

export const sharedWithMeScreenOptions = {title: SHARED_WITH_ME_TITLE};

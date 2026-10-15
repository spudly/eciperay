import {
  sharedWithMeInfiniteQueryOptions,
  useRecipeListFilters,
} from '@eciperay/client';
import {useInfiniteQuery} from '@tanstack/react-query';
import {useEffect, useRef, useCallback} from 'react';

import {SharedWithMeView} from '../components/shared/SharedWithMeView.js';
import {eciperay} from '../lib/api.js';

export const SharedWithMePage = () => {
  const {filters, controls} = useRecipeListFilters();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} =
    useInfiniteQuery(
      sharedWithMeInfiniteQueryOptions(
        params => eciperay.recipes.listSharedWithMe(params),
        filters,
      ),
    );

  const recipes = data?.pages.flat() ?? [];

  const handleLoadMore = useCallback(() => {
    /* v8 ignore else -- the observer effect below only invokes this when hasNextPage && !isFetchingNextPage, and the web view does not call onLoadMore */
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || !hasNextPage || isFetchingNextPage) {
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) {
        handleLoadMore();
      }
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [handleLoadMore, hasNextPage, isFetchingNextPage, recipes.length]);

  return (
    <SharedWithMeView
      {...controls}
      isLoading={isLoading}
      recipes={recipes}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={handleLoadMore}
      loadMoreRef={loadMoreRef}
    />
  );
};

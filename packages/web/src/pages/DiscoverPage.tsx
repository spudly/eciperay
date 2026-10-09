import {
  DISCOVER_EMPTY_MESSAGE,
  DISCOVER_SEARCH_PLACEHOLDER,
  DISCOVER_TITLE,
  publicRecipeDiscoveryInfiniteQueryOptions,
  useRecipeListFilters,
} from '@eciperay/client';
import {useInfiniteQuery} from '@tanstack/react-query';
import {useEffect, useRef} from 'react';

import {DiscoverView} from '../components/discover/DiscoverView.js';
import {PublicPageLayout} from '../components/PublicPageLayout.js';
import {eciperay} from '../lib/api.js';

export const DiscoverPage = () => {
  const {filters, controls} = useRecipeListFilters({
    includeStatus: true,
    defaultSort: 'newest',
  });
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} =
    useInfiniteQuery(
      publicRecipeDiscoveryInfiniteQueryOptions(
        params => eciperay.recipes.listPublic(params),
        filters,
      ),
    );

  const recipes = data?.pages.flat() ?? [];

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || !hasNextPage || isFetchingNextPage) {
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) {
        void fetchNextPage();
      }
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, recipes.length]);

  return (
    <PublicPageLayout>
      <DiscoverView
        title={DISCOVER_TITLE}
        searchPlaceholder={DISCOVER_SEARCH_PLACEHOLDER}
        recipes={recipes}
        loading={isLoading}
        loadingMore={isFetchingNextPage}
        emptyMessage={DISCOVER_EMPTY_MESSAGE}
        loadMoreRef={loadMoreRef}
        {...controls}
      />
    </PublicPageLayout>
  );
};

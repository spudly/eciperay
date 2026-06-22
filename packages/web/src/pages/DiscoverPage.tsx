import {
  DISCOVER_EMPTY_MESSAGE,
  DISCOVER_SEARCH_PLACEHOLDER,
  DISCOVER_TITLE,
  publicRecipeDiscoveryInfiniteQueryOptions,
} from '@eciperay/client';
import {useInfiniteQuery} from '@tanstack/react-query';
import {useDeferredValue, useEffect, useRef, useState} from 'react';

import {PublicPageLayout} from '../components/PublicPageLayout.js';
import {PublicRecipeDiscoveryCard} from '../components/PublicRecipeDiscoveryCard.js';
import {eciperay} from '../lib/api.js';

export const DiscoverPage = () => {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} =
    useInfiniteQuery(
      publicRecipeDiscoveryInfiniteQueryOptions(
        params => eciperay.recipes.listPublic(params),
        deferredSearch,
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
      <div>
        <h1 className="mb-4 text-2xl font-bold text-gray-900">
          {DISCOVER_TITLE}
        </h1>
        <input
          className="
            mb-4 w-full rounded-xl border border-gray-200 bg-white px-4 py-3
            text-base
          "
          placeholder={DISCOVER_SEARCH_PLACEHOLDER}
          value={search}
          onChange={e => {
            setSearch(e.target.value);
          }}
        />
        {isLoading ? (
          <p className="text-muted mt-8 text-center">Loading…</p>
        ) : recipes.length === 0 ? (
          <p className="text-muted mt-8 text-center">
            {DISCOVER_EMPTY_MESSAGE}
          </p>
        ) : (
          <>
            {recipes.map(recipe => (
              <PublicRecipeDiscoveryCard
                key={recipe.id}
                recipe={recipe}
              />
            ))}
            <div
              ref={loadMoreRef}
              className="py-4 text-center"
            >
              {isFetchingNextPage ? (
                <p className="text-muted text-sm">Loading more…</p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </PublicPageLayout>
  );
};

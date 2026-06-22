import {
  SHARED_WITH_ME_EMPTY_MESSAGE,
  SHARED_WITH_ME_TITLE,
  sharedWithMeInfiniteQueryOptions,
} from '@eciperay/client';
import {useInfiniteQuery} from '@tanstack/react-query';
import {useEffect, useRef} from 'react';

import {SharedRecipeListCard} from '../components/SharedRecipeListCard.js';
import {eciperay} from '../lib/api.js';

export const SharedWithMePage = () => {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} =
    useInfiniteQuery(
      sharedWithMeInfiniteQueryOptions(params =>
        eciperay.recipes.listSharedWithMe(params),
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
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">
        {SHARED_WITH_ME_TITLE}
      </h1>
      {isLoading ? (
        <p className="text-muted mt-8 text-center">Loading…</p>
      ) : recipes.length === 0 ? (
        <p className="text-muted mt-8 text-center">
          {SHARED_WITH_ME_EMPTY_MESSAGE}
        </p>
      ) : (
        <>
          {recipes.map(recipe => (
            <SharedRecipeListCard
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
  );
};

import {
  invalidateRecipeQueries,
  RECIPE_STATUS_FILTER_ALL,
  RECIPE_STATUS_FILTER_LABEL,
  RECIPE_STATUS_LABELS,
  RECIPE_STATUS_OPTIONS,
  recipeListInfiniteQueryOptions,
  useAnalytics,
} from '@eciperay/client';
import type {RecipeStatus} from '@eciperay/types';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {useDeferredValue, useEffect, useRef, useState} from 'react';

import {RecipeListCard} from '../components/RecipeListCard.js';
import {eciperay} from '../lib/api.js';

export const RecipesPage = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    typeof RECIPE_STATUS_FILTER_ALL | RecipeStatus
  >(RECIPE_STATUS_FILTER_ALL);
  const deferredSearch = useDeferredValue(search.trim());
  const queryClient = useQueryClient();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const analytics = useAnalytics();

  const {data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} =
    useInfiniteQuery(
      recipeListInfiniteQueryOptions(
        params => eciperay.recipes.list(params),
        deferredSearch,
        statusFilter === RECIPE_STATUS_FILTER_ALL ? '' : statusFilter,
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eciperay.recipes.delete(id),
    onSuccess: (_data, id) => {
      analytics.track('recipe_deleted', {recipe_id: id});
      void invalidateRecipeQueries(queryClient, id);
    },
  });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Recipes</h1>
      <input
        className="
          mb-4 w-full rounded-xl border border-gray-200 bg-white px-4 py-3
          text-base
        "
        placeholder="Search recipes…"
        value={search}
        onChange={e => {
          setSearch(e.target.value);
        }}
      />
      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium text-gray-700">
          {RECIPE_STATUS_FILTER_LABEL}
        </span>
        <select
          className="
            w-full rounded-xl border border-gray-200 bg-white px-4 py-3
            text-base
          "
          value={statusFilter}
          onChange={e => {
            setStatusFilter(
              e.target.value as typeof RECIPE_STATUS_FILTER_ALL | RecipeStatus,
            );
          }}
        >
          <option value={RECIPE_STATUS_FILTER_ALL}>All statuses</option>
          {RECIPE_STATUS_OPTIONS.map(status => (
            <option
              key={status}
              value={status}
            >
              {RECIPE_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>
      {isLoading ? (
        <p className="text-muted mt-8 text-center">Loading…</p>
      ) : recipes.length === 0 ? (
        <p className="text-muted mt-8 text-center">No recipes found.</p>
      ) : (
        <>
          {recipes.map(recipe => (
            <RecipeListCard
              key={recipe.id}
              recipe={recipe}
              onDelete={id => {
                deleteMutation.mutate(id);
              }}
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

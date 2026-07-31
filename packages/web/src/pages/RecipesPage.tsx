import {
  invalidateRecipeQueries,
  RECIPE_STATUS_FILTER_ALL,
  recipeListInfiniteQueryOptions,
  useAnalytics,
} from '@eciperay/client';
import type {RecipeStatus, RecipeDetail} from '@eciperay/types';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import {useNavigate} from 'react-router-dom';

import {RecipesListView} from '../components/recipes/RecipesListView.js';
import {eciperay} from '../lib/api.js';

export const RecipesPage = () => {
  const navigate = useNavigate();
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

  const handleLoadMore = useCallback(() => {
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eciperay.recipes.delete(id),
    onSuccess: (_data, id) => {
      analytics.track('recipe_deleted', {recipe_id: id});
      void invalidateRecipeQueries(queryClient, id);
    },
  });

  const handleDelete = (recipe: RecipeDetail) => {
    deleteMutation.mutate(recipe.id);
  };

  return (
    <RecipesListView
      search={search}
      onSearchChange={setSearch}
      isLoading={isLoading}
      recipes={recipes}
      isFetchingNextPage={isFetchingNextPage}
      onRecipePress={recipeId => {
        void navigate(`/recipes/${recipeId}`);
      }}
      onRecipeDelete={handleDelete}
      onLoadMore={handleLoadMore}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      loadMoreRef={loadMoreRef}
    />
  );
};

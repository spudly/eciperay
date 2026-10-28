import {
  invalidateRecipeQueries,
  queryKeys,
  recipeListInfiniteQueryOptions,
  useAnalytics,
  useRecipeListFilters,
} from '@eciperay/client';
import type {RecipeDetail} from '@eciperay/types';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {useEffect, useRef, useCallback, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {RecipesListView} from '../components/recipes/RecipesListView.js';
import {eciperay} from '../lib/api.js';

export const RecipesPage = () => {
  const navigate = useNavigate();
  const {filters, controls} = useRecipeListFilters();
  const queryClient = useQueryClient();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const analytics = useAnalytics();

  const {data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} =
    useInfiniteQuery(
      recipeListInfiniteQueryOptions(
        params => eciperay.recipes.list(params),
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

  // A failed delete must not be silent (#263): the mutation's error
  // is rendered beside the affected card (role="alert") and the
  // recipe stays listed.
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteErrorRecipeId, setDeleteErrorRecipeId] = useState<string | null>(
    null,
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eciperay.recipes.delete(id),
    onSuccess: (_data, id) => {
      analytics.track('recipe_deleted', {recipe_id: id});
      void invalidateRecipeQueries(queryClient, id);
      // Drop the deleted recipe's detail cache too, so a later visit to
      // its detail page cannot render the stale cached recipe (#273).
      queryClient.removeQueries({queryKey: queryKeys.recipe(id)});
    },
    onError: (error, id) => {
      setDeleteError(
        `Could not delete recipe: ${
          error instanceof Error ? error.message : 'Recipe deletion failed'
        }`,
      );
      setDeleteErrorRecipeId(id);
    },
  });

  const handleDelete = (recipe: RecipeDetail) => {
    setDeleteError(null);
    setDeleteErrorRecipeId(null);
    deleteMutation.mutate(recipe.id);
  };

  return (
    <RecipesListView
      {...controls}
      isLoading={isLoading}
      recipes={recipes}
      isFetchingNextPage={isFetchingNextPage}
      onRecipePress={recipeId => {
        void navigate(`/recipes/${recipeId}`);
      }}
      onRecipeDelete={handleDelete}
      deleteError={deleteError}
      deleteErrorRecipeId={deleteErrorRecipeId}
      isDeletePending={deleteMutation.isPending}
      onLoadMore={handleLoadMore}
      loadMoreRef={loadMoreRef}
    />
  );
};

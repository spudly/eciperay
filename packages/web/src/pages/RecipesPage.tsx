import {queryKeys, recipeListInfiniteQueryOptions} from '@eciperay/client';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {useDeferredValue, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import type {RecipeDetail} from '@eciperay/types';

import {eciperay} from '../lib/api.js';

const RecipeThumbnail = ({recipe}: {recipe: RecipeDetail}) =>
  recipe.imageUrl ? (
    <img
      src={recipe.imageUrl}
      alt={recipe.title}
      className="size-16 shrink-0 rounded-lg bg-gray-50 object-cover"
    />
  ) : (
    <div
      aria-hidden
      className="size-16 shrink-0 rounded-lg bg-gray-100"
    />
  );

const RecipeCard = ({
  recipe,
  onDelete,
}: {
  recipe: RecipeDetail;
  onDelete: (id: string) => void;
}) => (
  <div
    className="mb-3 flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm"
  >
    <Link
      to={`/recipes/${recipe.id}`}
      className="shrink-0"
    >
      <RecipeThumbnail recipe={recipe} />
    </Link>
    <Link
      to={`/recipes/${recipe.id}`}
      className="min-w-0 flex-1"
    >
      <p className="text-base font-semibold text-gray-900">{recipe.title}</p>
      <p className="text-muted mt-1 text-sm">
        {recipe.servings} servings
        {recipe.cookTimeMin ? ` · ${recipe.cookTimeMin} min` : ''}
      </p>
    </Link>
    <button
      type="button"
      className="ms-3 rounded-lg bg-red-50 px-3 py-1 text-sm text-red-600"
      onClick={() => {
        if (window.confirm(`Delete "${recipe.title}"?`)) {
          onDelete(recipe.id);
        }
      }}
    >
      Delete
    </button>
  </div>
);

export const RecipesPage = () => {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const queryClient = useQueryClient();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage} =
    useInfiniteQuery(
      recipeListInfiniteQueryOptions(
        params => eciperay.recipes.list(params),
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eciperay.recipes.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: queryKeys.recipes()});
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
      {isLoading ? (
        <p className="text-muted mt-8 text-center">Loading…</p>
      ) : recipes.length === 0 ? (
        <p className="text-muted mt-8 text-center">No recipes found.</p>
      ) : (
        <>
          {recipes.map(recipe => (
            <RecipeCard
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

import {queryKeys} from '@recipoo/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {Link} from 'react-router-dom';
import type {RecipeDetail} from '@recipoo/types';

import {recipoo} from '../lib/api.js';

const RecipeCard = ({
  recipe,
  onDelete,
}: {
  recipe: RecipeDetail;
  onDelete: (id: string) => void;
}) => (
  <div className="mb-3 flex items-center rounded-xl bg-white p-4 shadow-sm">
    <Link
      to={`/recipes/${recipe.id}`}
      className="flex-1"
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
  const queryClient = useQueryClient();

  const {data: recipes = [], isLoading} = useQuery({
    queryKey: queryKeys.recipes(),
    queryFn: () => recipoo.recipes.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => recipoo.recipes.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: queryKeys.recipes()});
    },
  });

  const filtered = recipes.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()),
  );

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
      ) : filtered.length === 0 ? (
        <p className="text-muted mt-8 text-center">No recipes found.</p>
      ) : (
        filtered.map(recipe => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onDelete={id => {
              deleteMutation.mutate(id);
            }}
          />
        ))
      )}
    </div>
  );
};

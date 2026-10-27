import {
  homeRecentlyViewedRecipesQueryOptions,
  queryKeys,
  removeRecipeView,
} from '@eciperay/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import type {RecipeDetail} from '@eciperay/types';

import {HomeView} from '../components/home/HomeView.js';
import {eciperay} from '../lib/api.js';
import {recipeViewHistoryStorage} from '../lib/recipeViewHistoryStorage.js';

export const HomePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {data: recipes = [], isLoading} = useQuery(
    homeRecentlyViewedRecipesQueryOptions(
      id => eciperay.recipes.get(id),
      recipeViewHistoryStorage,
    ),
  );

  // Same silent-failure fix as the recipes list (#263): surface a
  // failed delete beside its card instead of leaving the recipe
  // listed with no error.
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteErrorRecipeId, setDeleteErrorRecipeId] = useState<string | null>(
    null,
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await eciperay.recipes.delete(id);
    },
    onSuccess: (_data, id) => {
      // History cleanup is best-effort: the server delete already
      // succeeded, so a storage failure must not route to onError.
      void removeRecipeView(recipeViewHistoryStorage, id).catch(
        () => undefined,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.recipes('home-recently-viewed'),
      });
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
    <HomeView
      isLoading={isLoading}
      recipes={recipes}
      onBrowsePress={() => {
        void navigate('/recipes');
      }}
      onAddPress={() => {
        void navigate('/add');
      }}
      onSharedWithMePress={() => {
        void navigate('/shared-with-me');
      }}
      onRecipePress={recipeId => {
        void navigate(`/recipes/${recipeId}`);
      }}
      onRecipeDelete={handleDelete}
      deleteError={deleteError}
      deleteErrorRecipeId={deleteErrorRecipeId}
      isDeletePending={deleteMutation.isPending}
    />
  );
};

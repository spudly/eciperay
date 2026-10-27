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
  // failed delete instead of leaving the recipe listed with no error.
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await eciperay.recipes.delete(id);
      await removeRecipeView(recipeViewHistoryStorage, id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.recipes('home-recently-viewed'),
      });
    },
    onError: error => {
      setDeleteError(
        `Could not delete recipe: ${
          error instanceof Error ? error.message : 'Recipe deletion failed'
        }`,
      );
    },
  });

  const handleDelete = (recipe: RecipeDetail) => {
    setDeleteError(null);
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
      isDeletePending={deleteMutation.isPending}
    />
  );
};

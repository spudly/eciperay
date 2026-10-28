import {
  HOME_ADD_LABEL,
  HOME_BROWSE_LABEL,
  HOME_EMPTY_MESSAGE,
  HOME_RECIPES_SECTION_TITLE,
  HOME_SHARED_WITH_ME_LABEL,
  HOME_SUBTITLE,
  HOME_TITLE,
  homeRecentlyViewedRecipesQueryOptions,
  queryKeys,
  removeRecipeView,
} from '@eciperay/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import type {RecipeDetail} from '@eciperay/types';

import {HomePage as HomePageView} from '@spudly/ui/pages';

import {RecipeListCard} from '../components/RecipeListCard.js';
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
      // History cleanup is best-effort and must finish before the
      // onSuccess invalidation refetches the history-driven list —
      // but a storage failure must not route to onError: the server
      // delete already succeeded.
      await removeRecipeView(recipeViewHistoryStorage, id).catch(
        () => undefined,
      );
    },
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.recipes('home-recently-viewed'),
      });
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

  const recipesById = new Map(recipes.map(recipe => [recipe.id, recipe]));

  return (
    <HomePageView
      title={HOME_TITLE}
      subtitle={HOME_SUBTITLE}
      browseLabel={HOME_BROWSE_LABEL}
      addLabel={HOME_ADD_LABEL}
      sharedWithMeLabel={HOME_SHARED_WITH_ME_LABEL}
      recipesTitle={HOME_RECIPES_SECTION_TITLE}
      emptyMessage={HOME_EMPTY_MESSAGE}
      isLoading={isLoading}
      recipes={recipes.map(recipe => ({id: recipe.id}))}
      renderRecipeRow={row => {
        const recipe = recipesById.get(row.id);
        if (!recipe) {
          return null;
        }
        return (
          <RecipeListCard
            recipe={recipe}
            isDeleting={deleteMutation.isPending}
            deleteError={deleteErrorRecipeId === recipe.id ? deleteError : null}
            onPress={() => {
              void navigate(`/recipes/${recipe.id}`);
            }}
            onDelete={id => {
              const match = recipes.find(item => item.id === id);
              if (match) {
                handleDelete(match);
              }
            }}
          />
        );
      }}
      onBrowsePress={() => {
        void navigate('/recipes');
      }}
      onAddPress={() => {
        void navigate('/add');
      }}
      onSharedWithMePress={() => {
        void navigate('/shared-with-me');
      }}
    />
  );
};

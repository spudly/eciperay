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
import {Link} from 'react-router-dom';

import {RecipeListCard} from '../components/RecipeListCard.js';
import {eciperay} from '../lib/api.js';
import {recipeViewHistoryStorage} from '../lib/recipeViewHistoryStorage.js';

export const HomePage = () => {
  const queryClient = useQueryClient();

  const {data: recipes = [], isLoading} = useQuery(
    homeRecentlyViewedRecipesQueryOptions(
      id => eciperay.recipes.get(id),
      recipeViewHistoryStorage,
    ),
  );

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
  });

  return (
    <div className="py-8">
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">{HOME_TITLE}</h1>
        <p className="text-muted mb-8">{HOME_SUBTITLE}</p>
        <div className="flex justify-center gap-4">
          <Link
            to="/recipes"
            className="bg-primary rounded-xl px-6 py-3 font-semibold text-white"
          >
            {HOME_BROWSE_LABEL}
          </Link>
          <Link
            to="/add"
            className="
              rounded-xl bg-gray-100 px-6 py-3 font-semibold text-gray-700
            "
          >
            {HOME_ADD_LABEL}
          </Link>
          <Link
            to="/shared-with-me"
            className="
              rounded-xl bg-gray-100 px-6 py-3 font-semibold text-gray-700
            "
          >
            {HOME_SHARED_WITH_ME_LABEL}
          </Link>
        </div>
      </div>

      <h2 className="mb-4 text-xl font-bold text-gray-900">
        {HOME_RECIPES_SECTION_TITLE}
      </h2>
      {isLoading ? (
        <p className="text-muted mt-8 text-center">Loading…</p>
      ) : recipes.length === 0 ? (
        <p className="text-muted mt-8 text-center">{HOME_EMPTY_MESSAGE}</p>
      ) : (
        recipes.map(recipe => (
          <RecipeListCard
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

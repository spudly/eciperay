import {
  invalidateRecipeQueries,
  queryKeys,
  recipeDetailToInput,
} from '@recipoo/client';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useNavigate, useParams} from 'react-router-dom';
import type {RecipeInput} from '@recipoo/types';

import {RecipeForm} from '../components/recipe/RecipeForm.js';
import {recipoo} from '../lib/api.js';

export const EditRecipePage = () => {
  const {recipeId = ''} = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {data: recipe, isLoading} = useQuery({
    queryKey: queryKeys.recipe(recipeId),
    queryFn: () => recipoo.recipes.get(recipeId),
    enabled: recipeId.length > 0,
  });

  const handleSubmit = async (input: RecipeInput) => {
    await recipoo.recipes.put(recipeId, input);
    await invalidateRecipeQueries(queryClient, recipeId);
    void navigate(`/recipes/${recipeId}`);
  };

  if (isLoading || !recipe) {
    return <p>Loading…</p>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Edit Recipe</h1>
      <RecipeForm
        initial={recipeDetailToInput(recipe)}
        recipeId={recipeId}
        submitLabel="Save Changes"
        onSubmit={handleSubmit}
      />
    </div>
  );
};

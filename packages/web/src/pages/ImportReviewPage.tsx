import {
  invalidateRecipeQueries,
  queryKeys,
  recipeDetailToInput,
} from '@eciperay/client';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useNavigate, useParams} from 'react-router-dom';
import type {RecipeInput} from '@eciperay/types';

import {RecipeForm} from '../components/recipe/RecipeForm.js';
import {eciperay} from '../lib/api.js';

export const ImportReviewPage = () => {
  const {recipeId = ''} = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {data: recipe, isLoading} = useQuery({
    queryKey: queryKeys.recipe(recipeId),
    queryFn: () => eciperay.recipes.get(recipeId),
    enabled: recipeId.length > 0,
  });

  const handleSubmit = async (input: RecipeInput) => {
    await eciperay.recipes.put(recipeId, input);
    await invalidateRecipeQueries(queryClient, recipeId);
    void navigate(`/recipes/${recipeId}`);
  };

  if (isLoading || !recipe) {
    return <p>Loading…</p>;
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Review Import</h1>
      <p className="text-muted mb-6 text-sm">
        Review and edit the imported recipe before saving.
      </p>
      <RecipeForm
        initial={recipeDetailToInput(recipe)}
        recipeId={recipeId}
        submitLabel="Save Recipe"
        onSubmit={handleSubmit}
      />
    </div>
  );
};

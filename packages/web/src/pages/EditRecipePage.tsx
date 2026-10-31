import {
  invalidateRecipeQueries,
  queryKeys,
  recipeDetailToInput,
} from '@eciperay/client';
import {EditRecipePage as EditRecipeShell} from '@spudly/ui/pages';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useNavigate, useParams} from 'react-router-dom';
import type {RecipeInput} from '@eciperay/types';

import {ScreenLoadingGate} from '../components/ScreenLoadingGate.js';
import {eciperay} from '../lib/api.js';

import {RecipeFormHost} from './RecipeFormHost.js';

export const EditRecipePage = () => {
  const {recipeId = ''} = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {data: recipe, isLoading} = useQuery({
    queryKey: queryKeys.recipe(recipeId),
    queryFn: () => eciperay.recipes.get(recipeId),
    enabled: recipeId.length > 0,
  });

  const versionId = recipe?.versionId;

  const handleSubmit = async (input: RecipeInput) => {
    await eciperay.recipes.put(recipeId, input);
    await invalidateRecipeQueries(queryClient, recipeId, versionId);
    void navigate(`/recipes/${recipeId}`);
  };

  if (isLoading || !recipe) {
    return <ScreenLoadingGate pending>{null}</ScreenLoadingGate>;
  }

  return (
    <EditRecipeShell>
      <RecipeFormHost
        initial={recipeDetailToInput(recipe)}
        recipeId={recipeId}
        contentLocked
        submitLabel="Save Changes"
        onSubmit={handleSubmit}
      />
    </EditRecipeShell>
  );
};

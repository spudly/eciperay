import {
  invalidateRecipeQueries,
  uploadRecipeImage,
  useAnalytics,
  useAuth,
} from '@eciperay/client';
import {useQueryClient} from '@tanstack/react-query';
import {useNavigate} from 'react-router-dom';
import type {RecipeInput} from '@eciperay/types';

import {ManualEntryView} from '../components/recipe/ManualEntryView.js';
import {RecipeForm} from '../components/recipe/RecipeForm.js';
import {eciperay} from '../lib/api.js';
import {supabase} from '../lib/supabase.js';

const emptyInput: RecipeInput = {
  title: '',
  servings: 4,
  ingredients: [],
  instructions: [],
  tagIds: [],
};

export const ManualEntryPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {session} = useAuth();
  const analytics = useAnalytics();

  const handleSubmit = async (input: RecipeInput, pendingImage?: File) => {
    const recipe = await eciperay.recipes.create(input);
    analytics.track('recipe_created', {
      recipe_id: recipe.recipeId,
      source: 'manual',
    });
    if (pendingImage && session?.user.id) {
      const imageUrl = await uploadRecipeImage(
        supabase,
        pendingImage,
        session.user.id,
        recipe.recipeId,
      );
      await eciperay.recipes.put(recipe.recipeId, {...input, imageUrl});
    }
    await invalidateRecipeQueries(
      queryClient,
      recipe.recipeId,
      recipe.versionId,
    );
    void navigate(`/recipes/${recipe.recipeId}`);
  };

  return (
    <ManualEntryView>
      <RecipeForm
        initial={emptyInput}
        submitLabel="Create Recipe"
        onSubmit={handleSubmit}
      />
    </ManualEntryView>
  );
};

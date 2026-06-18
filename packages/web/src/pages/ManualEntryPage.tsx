import {
  invalidateRecipeQueries,
  uploadRecipeImage,
  useAnalytics,
  useAuth,
} from '@eciperay/client';
import {useQueryClient} from '@tanstack/react-query';
import {useNavigate} from 'react-router-dom';
import type {RecipeInput} from '@eciperay/types';

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
    analytics.track('recipe_created', {recipe_id: recipe.id, source: 'manual'});
    if (pendingImage && session?.user.id) {
      const imageUrl = await uploadRecipeImage(
        supabase,
        pendingImage,
        session.user.id,
        recipe.id,
      );
      await eciperay.recipes.patch(recipe.id, {imageUrl});
    }
    await invalidateRecipeQueries(queryClient, recipe.id);
    void navigate(`/recipes/${recipe.id}`);
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Manual Entry</h1>
      <RecipeForm
        initial={emptyInput}
        submitLabel="Create Recipe"
        onSubmit={handleSubmit}
      />
    </div>
  );
};

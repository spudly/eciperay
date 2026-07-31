import {
  invalidateRecipeQueries,
  uploadRecipeImageFromBase64,
  useAnalytics,
  useAuth,
} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useQueryClient} from '@tanstack/react-query';
import type {RecipeInput} from '@eciperay/types';

import {ManualEntryView} from '../components/recipe/ManualEntryView';
import {RecipeForm} from '../components/recipe/RecipeForm';
import type {PendingRecipeImage} from '../lib/recipeImageAsset';
import {api} from '../lib/api';
import {supabase} from '../lib/supabase';
import type {AddStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<AddStackParamList, 'ManualEntry'>;

const emptyInput: RecipeInput = {
  title: '',
  servings: 4,
  ingredients: [],
  instructions: [],
  tagIds: [],
  status: 'idea',
};

export const ManualEntryScreen = ({navigation}: Props) => {
  const queryClient = useQueryClient();
  const {session} = useAuth();
  const analytics = useAnalytics();

  const handleSubmit = async (
    input: RecipeInput,
    pendingImage?: PendingRecipeImage,
  ) => {
    const recipe = await api.recipes.create(input);
    analytics.track('recipe_created', {
      recipe_id: recipe.recipeId,
      source: 'manual',
    });
    const recipeId = recipe.recipeId;
    if (pendingImage && session?.user.id) {
      const imageUrl = await uploadRecipeImageFromBase64(
        supabase,
        pendingImage.base64,
        pendingImage.contentType,
        {userId: session.user.id, recipeId},
      );
      await api.recipes.put(recipeId, {...input, imageUrl});
    }
    await invalidateRecipeQueries(queryClient, recipeId, recipe.versionId);
    navigation
      .getParent()
      ?.navigate('Recipes', {screen: 'RecipeDetail', params: {recipeId}});
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

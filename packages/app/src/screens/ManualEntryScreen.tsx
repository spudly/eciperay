import {
  invalidateRecipeQueries,
  uploadRecipeImageFromBase64,
  useAnalytics,
  useAuth,
} from '@eciperay/client';
import {useLingui} from '@lingui/react';
import {CommonActions} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ManualEntryPage} from '@spudly/ui';
import {useQueryClient} from '@tanstack/react-query';
import type {RecipeInput} from '@eciperay/types';

import {RecipeForm} from '../hosts/recipe/RecipeForm';
import type {PendingRecipeImage} from '../lib/recipeImageAsset';
import {eciperay} from '../lib/api';
import {supabase} from '../lib/supabase';
import type {AddStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<AddStackParamList, 'ManualEntry'>;

const emptyInput: RecipeInput = {
  title: '',
  servings: 4,
  ingredients: [],
  instructions: [],
  tagIds: [],
};

export const ManualEntryScreen = ({navigation, route}: Props) => {
  const {i18n} = useLingui();
  const queryClient = useQueryClient();
  const {session} = useAuth();
  const analytics = useAnalytics();

  const handleSubmit = async (
    input: RecipeInput,
    pendingImage?: PendingRecipeImage,
  ) => {
    const recipe = await eciperay.recipes.create(input);
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
      await eciperay.recipes.put(recipeId, {...input, imageUrl});
    }
    await invalidateRecipeQueries(queryClient, recipeId, recipe.versionId);
    // Same Add-stack reset as ImportReviewScreen (#533): leaving for the
    // Recipes tab completes this flow, so the Add tab restarts at its root.
    // Guarded the same way: a submission that completes after this form
    // left the stack must not wipe a newer screen.
    const stillInStack = navigation
      .getState()
      .routes.some(stackRoute => stackRoute.key === route.key);
    if (stillInStack) {
      navigation.dispatch(
        CommonActions.reset({index: 0, routes: [{name: 'AddScreen'}]}),
      );
    }
    navigation
      .getParent()
      ?.navigate('Recipes', {screen: 'RecipeDetail', params: {recipeId}});
  };

  return (
    <ManualEntryPage>
      <RecipeForm
        initial={emptyInput}
        submitLabel={i18n._({
          id: 'recipeForm.submitCreateRecipe',
          message: 'Create Recipe',
        })}
        onSubmit={handleSubmit}
      />
    </ManualEntryPage>
  );
};

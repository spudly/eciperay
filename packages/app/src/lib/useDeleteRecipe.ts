import {queryKeys, removeRecipeView, useAnalytics} from '@eciperay/client';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {Alert} from 'react-native';
import type {RecipeDetail} from '@eciperay/types';

import {api} from './api';
import {recipeViewHistoryStorage} from './recipeViewHistoryStorage';

export const useDeleteRecipe = (recipeId: string, onDeleted: () => void) => {
  const queryClient = useQueryClient();
  const analytics = useAnalytics();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.recipes.delete(recipeId);
      await removeRecipeView(recipeViewHistoryStorage, recipeId);
    },
    onSuccess: () => {
      analytics.track('recipe_deleted', {recipe_id: recipeId});
      void queryClient.invalidateQueries({queryKey: queryKeys.recipeLists()});
      onDeleted();
    },
  });

  const confirmDelete = (recipe: RecipeDetail) => {
    Alert.alert('Delete recipe', `Delete "${recipe.title}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteMutation.mutate();
        },
      },
    ]);
  };

  return {confirmDelete};
};

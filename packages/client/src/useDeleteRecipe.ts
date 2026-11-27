import {useMutation, useQueryClient} from '@tanstack/react-query';

import {useAnalytics} from './AnalyticsProvider.js';
import type {EciperayClient} from './createEciperayClient.js';
import {queryKeys} from './queryKeys.js';

export type UseDeleteRecipeOptions = {
  /** Runs on success, after the analytics event: navigation and any
   * host-specific cache cleanup live here. */
  onDeleted: () => void;
  /**
   * Removes the recipe from the host's view-history storage, inside
   * the mutation (after the server delete). Each host decides whether
   * a storage failure fails the mutation: the app awaits it plainly;
   * web catches it first — history cleanup is best-effort there
   * because the server delete already succeeded.
   */
  removeFromHistory?: () => Promise<void>;
  /** Hosts that render the failure themselves (web's confirmation
   * dialog) receive the raw error here. */
  onError?: (error: unknown) => void;
  /**
   * The recipe-list invalidation the app relies on. Web opts out: its
   * host invalidates the recipe queries itself in onDeleted.
   */
  invalidateLists?: boolean;
};

/**
 * Recipe deletion, shared by both hosts since #676: the delete
 * mutation, the view-history cleanup, the `recipe_deleted` analytics
 * event, and the list invalidation. Confirmation UI stays at the
 * host's edge — RN's Alert in the app, the page's confirmation dialog
 * on web — as do navigation and error rendering.
 */
export const useDeleteRecipe = (
  client: EciperayClient,
  recipeId: string,
  options: UseDeleteRecipeOptions,
) => {
  const queryClient = useQueryClient();
  const analytics = useAnalytics();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await client.recipes.delete(recipeId);
      await options.removeFromHistory?.();
    },
    onSuccess: () => {
      analytics.track('recipe_deleted', {recipe_id: recipeId});
      if (options.invalidateLists !== false) {
        void queryClient.invalidateQueries({queryKey: queryKeys.recipeLists()});
      }
      options.onDeleted();
    },
    ...(options.onError
      ? {
          onError: (error: unknown) => {
            options.onError?.(error);
          },
        }
      : {}),
  });

  return {
    deleteRecipe: () => {
      deleteMutation.mutate();
    },
    isDeletePending: deleteMutation.isPending,
  };
};

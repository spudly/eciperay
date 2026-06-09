import type {RecipeDetail, RecipeDraft} from '@recipoo/types';

import type {ApiClient} from './createApiClient.js';

export const createDraftsApi = (client: ApiClient) => ({
  listPending: (recipeId: string) =>
    client.fetch<RecipeDraft[]>(`/recipes/${recipeId}/drafts?status=pending`),
  approve: (recipeId: string, draftId: string) =>
    client.fetch<RecipeDetail>(
      `/recipes/${recipeId}/drafts/${draftId}/approve`,
      {method: 'POST'},
    ),
  reject: (recipeId: string, draftId: string) =>
    client.fetch<{status: string}>(
      `/recipes/${recipeId}/drafts/${draftId}/reject`,
      {method: 'POST'},
    ),
});

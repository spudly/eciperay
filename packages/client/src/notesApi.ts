import type {RecipeNote} from '@eciperay/types';

import type {ApiClient} from './createApiClient.js';

export const createNotesApi = (client: ApiClient) => ({
  list: (recipeId: string) =>
    client.fetch<RecipeNote[]>(`/recipes/${recipeId}/notes`),
  create: (recipeId: string, content: string) =>
    client.fetch<RecipeNote>(`/recipes/${recipeId}/notes`, {
      method: 'POST',
      body: JSON.stringify({content}),
    }),
});

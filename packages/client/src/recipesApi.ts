import type {RecipeDetail, RecipeInput} from '@recipoo/types';

import type {ApiClient} from './createApiClient.js';

export const createRecipesApi = (client: ApiClient) => ({
  list: () => client.fetch<RecipeDetail[]>('/recipes'),
  get: (id: string) => client.fetch<RecipeDetail>(`/recipes/${id}`),
  create: (input: RecipeInput) =>
    client.fetch<RecipeDetail>('/recipes', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  put: (id: string, input: RecipeInput) =>
    client.fetch<RecipeDetail>(`/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  patch: (id: string, body: Partial<RecipeInput>) =>
    client.fetch<RecipeDetail>(`/recipes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: (id: string) =>
    client.fetch<undefined>(`/recipes/${id}`, {method: 'DELETE'}),
});

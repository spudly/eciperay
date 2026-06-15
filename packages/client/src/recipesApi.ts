import type {RecipeDetail, RecipeInput} from '@recipoo/types';

import type {ApiClient} from './createApiClient.js';

type ListRecipesParams = {search?: string; limit?: number; offset?: number};

const buildListRecipesPath = (params?: ListRecipesParams): string => {
  if (!params) {
    return '/recipes';
  }
  const query = new URLSearchParams();
  if (params.search) {
    query.set('search', params.search);
  }
  if (params.limit !== undefined) {
    query.set('limit', String(params.limit));
  }
  if (params.offset !== undefined) {
    query.set('offset', String(params.offset));
  }
  const qs = query.toString();
  return qs.length > 0 ? `/recipes?${qs}` : '/recipes';
};

export const createRecipesApi = (client: ApiClient) => ({
  list: (params?: ListRecipesParams) =>
    client.fetch<RecipeDetail[]>(buildListRecipesPath(params)),
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

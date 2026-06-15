import type {
  RecipeDetail,
  RecipeExportBundle,
  RecipeInput,
} from '@recipoo/types';

import type {ApiClient} from './createApiClient.js';
import {fetchAllRecipePages} from './fetchAllRecipePages.js';
import {buildListUrl, type RecipeListParams} from './recipesListUrl.js';

export type {RecipeListParams} from './recipesListUrl.js';

export const createRecipesApi = (client: ApiClient) => ({
  list: (params?: RecipeListParams) =>
    client.fetch<RecipeDetail[]>(buildListUrl(params)),
  listAll: () => fetchAllRecipePages(client),
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
  exportRecipes: (recipeIds: string[]) =>
    client.fetch<RecipeExportBundle>('/recipes/export', {
      method: 'POST',
      body: JSON.stringify({recipeIds}),
    }),
});

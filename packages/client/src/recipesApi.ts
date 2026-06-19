import type {
  CreateRecipeResult,
  RecipeDetail,
  RecipeExportBundle,
  RecipeInput,
  RecipeLifecycleStatus,
} from '@eciperay/types';

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
    client.fetch<RecipeDetail & CreateRecipeResult>('/recipes', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  put: (id: string, input: RecipeInput) =>
    client.fetch<RecipeDetail>(`/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  patchLifecycle: (id: string, status: RecipeLifecycleStatus) =>
    client.fetch<RecipeDetail>(`/recipes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({status}),
    }),
  delete: (id: string) =>
    client.fetch<undefined>(`/recipes/${id}`, {method: 'DELETE'}),
  exportRecipes: (recipeIds: string[]) =>
    client.fetch<RecipeExportBundle>('/recipes/export', {
      method: 'POST',
      body: JSON.stringify({recipeIds}),
    }),
});

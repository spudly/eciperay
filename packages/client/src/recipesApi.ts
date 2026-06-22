import type {
  CreateRecipeResult,
  PublicRecipeResponse,
  RecipeDetail,
  RecipeExportBundle,
  RecipeInput,
  RecipeLifecycleStatus,
  RecipeSharingUpdateInput,
  RecipeSharingUpdateResult,
} from '@eciperay/types';

import type {ApiClient} from './createApiClient.js';
import {fetchAllRecipePages} from './fetchAllRecipePages.js';
import {
  buildListUrl,
  buildSharedWithMeUrl,
  type RecipeListParams,
} from './recipesListUrl.js';

export type {RecipeListParams} from './recipesListUrl.js';

type PublicRecipeRequest = {slug?: string; shareToken?: string};

const buildPublicRecipePath = (
  id: string,
  {slug, shareToken}: PublicRecipeRequest = {},
): string => {
  const slugSegment = slug ? `/${encodeURIComponent(slug)}` : '';
  const query = shareToken ? `?t=${encodeURIComponent(shareToken)}` : '';
  return `/public/recipes/${id}${slugSegment}${query}`;
};

/* eslint-disable max-lines-per-function -- API method map */
export const createRecipesApi = (client: ApiClient) => ({
  list: (params?: RecipeListParams) =>
    client.fetch<RecipeDetail[]>(buildListUrl(params)),
  listSharedWithMe: (params?: Omit<RecipeListParams, 'search'>) =>
    client.fetch<RecipeDetail[]>(buildSharedWithMeUrl(params)),
  listAll: () => fetchAllRecipePages(client),
  get: (id: string) => client.fetch<RecipeDetail>(`/recipes/${id}`),
  getPublic: (id: string, opts?: PublicRecipeRequest) =>
    client.fetch<PublicRecipeResponse>(buildPublicRecipePath(id, opts)),
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
  patchSharing: (id: string, input: RecipeSharingUpdateInput) =>
    client.fetch<RecipeSharingUpdateResult>(`/recipes/${id}/sharing`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  rotateShareToken: (id: string) =>
    client.fetch<RecipeSharingUpdateResult>(
      `/recipes/${id}/sharing/rotate-token`,
      {method: 'POST'},
    ),
  delete: (id: string) =>
    client.fetch<undefined>(`/recipes/${id}`, {method: 'DELETE'}),
  exportRecipes: (recipeIds: string[]) =>
    client.fetch<RecipeExportBundle>('/recipes/export', {
      method: 'POST',
      body: JSON.stringify({recipeIds}),
    }),
  acceptImport: (id: string) =>
    client.fetch<RecipeDetail>(`/recipes/${id}/import/accept`, {
      method: 'POST',
    }),
});

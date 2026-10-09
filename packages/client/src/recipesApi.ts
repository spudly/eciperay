import type {
  CreateRecipeResult,
  PublicRecipeDiscoveryItem,
  PublicRecipeResponse,
  RecipeComment,
  RecipeCommentInput,
  RecipeDetail,
  RecipeExportBundle,
  RecipeInput,
  RecipeStatus,
  RecipeRatingInput,
  RecipeRatingSummary,
  RecipeSharingUpdateInput,
  RecipeSharingUpdateResult,
} from '@eciperay/types';

import type {ApiClient} from './createApiClient.js';
import {fetchAllRecipePages} from './fetchAllRecipePages.js';
import {
  buildListUrl,
  buildPublicRecipesUrl,
  buildSharedWithMeUrl,
  type PublicRecipeDiscoveryParams,
  type RecipeListParams,
} from './recipesListUrl.js';

export type {
  PublicRecipeDiscoveryParams,
  RecipeListParams,
} from './recipesListUrl.js';

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
  listSharedWithMe: (params?: RecipeListParams) =>
    client.fetch<RecipeDetail[]>(buildSharedWithMeUrl(params)),
  listAll: () => fetchAllRecipePages(client),
  get: (id: string) =>
    client.fetch<RecipeDetail & RecipeRatingSummary>(`/recipes/${id}`),
  getPublic: (id: string, opts?: PublicRecipeRequest) =>
    client.fetch<PublicRecipeResponse>(buildPublicRecipePath(id, opts)),
  listPublic: (params?: PublicRecipeDiscoveryParams) =>
    client.fetch<PublicRecipeDiscoveryItem[]>(buildPublicRecipesUrl(params)),
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
  patchStatus: (id: string, status: RecipeStatus) =>
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
  clone: (id: string, opts?: {shareToken?: string}) =>
    client.fetch<RecipeDetail & CreateRecipeResult>(`/recipes/${id}/clone`, {
      method: 'POST',
      body: JSON.stringify(opts ?? {}),
    }),
  putRating: (id: string, input: RecipeRatingInput) =>
    client.fetch<RecipeDetail & RecipeRatingSummary>(`/recipes/${id}/rating`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  deleteRating: (id: string) =>
    client.fetch<RecipeDetail & RecipeRatingSummary>(`/recipes/${id}/rating`, {
      method: 'DELETE',
    }),
  listComments: (id: string) =>
    client.fetch<RecipeComment[]>(`/recipes/${id}/comments`),
  createComment: (id: string, input: RecipeCommentInput) =>
    client.fetch<RecipeComment>(`/recipes/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateComment: (id: string, commentId: string, input: RecipeCommentInput) =>
    client.fetch<RecipeComment>(`/recipes/${id}/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  deleteComment: (id: string, commentId: string) =>
    client.fetch<undefined>(`/recipes/${id}/comments/${commentId}`, {
      method: 'DELETE',
    }),
  listPublicComments: (id: string, opts?: {shareToken?: string}) => {
    const query = opts?.shareToken
      ? `?t=${encodeURIComponent(opts.shareToken)}`
      : '';
    return client.fetch<RecipeComment[]>(
      `/public/recipes/${id}/comments${query}`,
    );
  },
});

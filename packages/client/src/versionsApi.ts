import type {
  RecipeDetail,
  RecipeVersionDetail,
  RecipeVersionInput,
  RecipeVersionSummary,
} from '@eciperay/types';

import type {ApiClient} from './createApiClient.js';

export type TweakWithAiResult = {
  versionId: string;
  changeSummary: string;
  version: RecipeVersionDetail;
};

export const createVersionsApi = (client: ApiClient) => ({
  list: (recipeId: string) =>
    client.fetch<RecipeVersionSummary[]>(`/recipes/${recipeId}/versions`),
  get: (recipeId: string, versionId: string) =>
    client.fetch<RecipeVersionDetail>(
      `/recipes/${recipeId}/versions/${versionId}`,
    ),
  create: (recipeId: string) =>
    client.fetch<RecipeVersionDetail>(`/recipes/${recipeId}/versions`, {
      method: 'POST',
    }),
  put: (recipeId: string, versionId: string, input: RecipeVersionInput) =>
    client.fetch<RecipeVersionDetail>(
      `/recipes/${recipeId}/versions/${versionId}`,
      {method: 'PUT', body: JSON.stringify(input)},
    ),
  activate: (recipeId: string, versionId: string) =>
    client.fetch<RecipeDetail>(
      `/recipes/${recipeId}/versions/${versionId}/activate`,
      {method: 'POST'},
    ),
  tweakWithAi: (recipeId: string, prompt: string) =>
    client.fetch<TweakWithAiResult>(`/recipes/${recipeId}/versions/ai`, {
      method: 'POST',
      body: JSON.stringify({prompt}),
    }),
});

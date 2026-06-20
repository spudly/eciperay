import type {
  BulkImportResult,
  CreateRecipeResult,
  RecipeDetail,
  RecipeExportBundle,
} from '@eciperay/types';

import type {ApiClient} from './createApiClient.js';

export const createImportApi = (client: ApiClient) => ({
  importUrl: (url: string) =>
    client.fetch<RecipeDetail & CreateRecipeResult>('/recipes/import/url', {
      method: 'POST',
      body: JSON.stringify({url}),
    }),
  importImage: (imageBase64: string) =>
    client.fetch<RecipeDetail & CreateRecipeResult>('/recipes/import/image', {
      method: 'POST',
      body: JSON.stringify({imageBase64}),
    }),
  importText: (text: string) =>
    client.fetch<RecipeDetail & CreateRecipeResult>('/recipes/import/text', {
      method: 'POST',
      body: JSON.stringify({text}),
    }),
  importBulk: (
    bundle: RecipeExportBundle | Pick<RecipeExportBundle, 'recipes'>,
  ) =>
    client.fetch<BulkImportResult>('/recipes/import/bulk', {
      method: 'POST',
      body: JSON.stringify(bundle),
    }),
});

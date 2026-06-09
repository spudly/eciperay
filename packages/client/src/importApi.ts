import type {RecipeDetail} from '@recipoo/types';

import type {ApiClient} from './createApiClient.js';

export const createImportApi = (client: ApiClient) => ({
  importUrl: (url: string) =>
    client.fetch<RecipeDetail>('/recipes/import/url', {
      method: 'POST',
      body: JSON.stringify({url}),
    }),
  importImage: (imageBase64: string) =>
    client.fetch<RecipeDetail>('/recipes/import/image', {
      method: 'POST',
      body: JSON.stringify({imageBase64}),
    }),
});

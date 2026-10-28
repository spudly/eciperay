import type {CookLog, CookLogInput} from '@eciperay/types';

import type {ApiClient} from './createApiClient.js';

export const createCookLogsApi = (client: ApiClient) => ({
  list: (recipeId: string, versionId: string) =>
    client.fetch<CookLog[]>(`/recipes/${recipeId}/versions/${versionId}/cooks`),
  create: (recipeId: string, versionId: string, input: CookLogInput) =>
    client.fetch<CookLog>(`/recipes/${recipeId}/versions/${versionId}/cooks`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  remove: (recipeId: string, versionId: string, cookLogId: string) =>
    client.fetch<undefined>(
      `/recipes/${recipeId}/versions/${versionId}/cooks/${cookLogId}`,
      {method: 'DELETE'},
    ),
});

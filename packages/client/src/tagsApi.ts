import type {Tag} from '@eciperay/types';

import type {ApiClient} from './createApiClient.js';

export const createTagsApi = (client: ApiClient) => ({
  list: () => client.fetch<Tag[]>('/tags'),
  create: (name: string, color?: string) =>
    client.fetch<Tag>('/tags', {
      method: 'POST',
      body: JSON.stringify({name, color}),
    }),
  update: (id: string, updates: {name?: string; color?: string}) =>
    client.fetch<Tag>(`/tags/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  delete: (id: string) =>
    client.fetch<undefined>(`/tags/${id}`, {method: 'DELETE'}),
});

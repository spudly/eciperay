import type {Tag} from '@recipoo/types';

import type {ApiClient} from './createApiClient.js';

export const createTagsApi = (client: ApiClient) => ({
  list: () => client.fetch<Tag[]>('/tags'),
  create: (name: string, color?: string) =>
    client.fetch<Tag>('/tags', {
      method: 'POST',
      body: JSON.stringify({name, color}),
    }),
  delete: (id: string) =>
    client.fetch<undefined>(`/tags/${id}`, {method: 'DELETE'}),
});

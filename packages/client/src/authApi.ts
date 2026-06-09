import type {ApiClient} from './createApiClient.js';

export const createAuthApi = (client: ApiClient) => ({
  syncUser: () => client.fetch<undefined>('/auth/sync', {method: 'POST'}),
});

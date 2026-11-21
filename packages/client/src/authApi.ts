import type {User} from '@eciperay/types';

import type {ApiClient} from './createApiClient.js';

export const createAuthApi = (client: ApiClient) => ({
  syncUser: () => client.fetch<undefined>('/auth/sync', {method: 'POST'}),
  // The signed-in user's profile, including the server-computed
  // isAdmin flag (#621) that gates the Tags management UI.
  me: () => client.fetch<User>('/auth/me'),
});

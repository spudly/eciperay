import type {AccountExportBundle} from '@eciperay/types';

import type {ApiClient} from './createApiClient.js';

export const createAccountApi = (client: ApiClient) => ({
  exportData: () => client.fetch<AccountExportBundle>('/account/export'),
  deleteAccount: () => client.fetch<undefined>('/account', {method: 'DELETE'}),
});

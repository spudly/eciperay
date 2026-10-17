import type {ApiClient} from './createApiClient.js';

export const createBillingApi = (client: ApiClient) => ({
  createPortalLink: () =>
    client.fetch<{url: string}>('/billing/portal-link', {method: 'POST'}),
});

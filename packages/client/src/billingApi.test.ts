import {createBillingApi} from './billingApi.js';

describe('createBillingApi', () => {
  test('creates a portal link', async () => {
    const fetch = jest
      .fn()
      .mockResolvedValue({url: 'https://portal.example/session'});
    const api = createBillingApi({fetch});

    const result = await api.createPortalLink();

    expect(fetch).toHaveBeenCalledWith('/billing/portal-link', {
      method: 'POST',
    });
    expect(result).toEqual({url: 'https://portal.example/session'});
  });
});

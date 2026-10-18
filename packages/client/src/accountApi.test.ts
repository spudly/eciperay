import {createAccountApi} from './accountApi.js';

describe('createAccountApi', () => {
  test('calls account endpoints', async () => {
    const fetch = jest.fn().mockResolvedValue({formatVersion: 1});
    const api = createAccountApi({fetch});

    await api.exportData();
    await api.deleteAccount();

    expect(fetch).toHaveBeenCalledWith('/account/export');
    expect(fetch).toHaveBeenCalledWith('/account', {method: 'DELETE'});
  });

  test('calls the entitlement endpoint', async () => {
    const fetch = jest.fn().mockResolvedValue({plan: 'plus'});
    const api = createAccountApi({fetch});

    await api.getEntitlement();

    expect(fetch).toHaveBeenCalledWith('/account/entitlement');
  });

  test('calls personal access token endpoints', async () => {
    const fetch = jest.fn().mockResolvedValue([]);
    const api = createAccountApi({fetch});

    await api.listPersonalAccessTokens();
    await api.createPersonalAccessToken('Claude Desktop');
    await api.revokePersonalAccessToken('token-uuid-1');

    expect(fetch).toHaveBeenCalledWith('/account/personal-access-tokens');
    expect(fetch).toHaveBeenCalledWith('/account/personal-access-tokens', {
      method: 'POST',
      body: JSON.stringify({name: 'Claude Desktop'}),
    });
    expect(fetch).toHaveBeenCalledWith(
      '/account/personal-access-tokens/token-uuid-1',
      {method: 'DELETE'},
    );
  });
});

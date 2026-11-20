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

  test('calls the author display endpoints', async () => {
    const settings = {displayName: 'Stephen', showOnPublicRecipes: true};
    const fetch = jest.fn().mockResolvedValue(settings);
    const api = createAccountApi({fetch});

    await expect(api.getAuthorDisplay()).resolves.toEqual(settings);
    await expect(api.putAuthorDisplay(settings)).resolves.toEqual(settings);

    expect(fetch).toHaveBeenCalledWith('/account/author-display');
    expect(fetch).toHaveBeenCalledWith('/account/author-display', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  });

  test('calls the entitlement endpoint', async () => {
    const fetch = jest.fn().mockResolvedValue({plan: 'plus'});
    const api = createAccountApi({fetch});

    await api.getEntitlement();

    expect(fetch).toHaveBeenCalledWith('/account/entitlement');
  });

  test('calls the entitlement refresh endpoint', async () => {
    const fetch = jest.fn().mockResolvedValue({plan: 'plus'});
    const api = createAccountApi({fetch});

    await api.refreshEntitlement();

    expect(fetch).toHaveBeenCalledWith('/account/entitlement/refresh', {
      method: 'POST',
    });
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

  test('calls family sharing endpoints', async () => {
    const grant = {
      ownerUserId: 'owner-1',
      recipientUserId: 'recipient-1',
      recipientEmail: 'family@example.com',
      recipientDisplayName: null,
      createdAt: '2026-11-20T00:00:00.000Z',
    };
    const fetch = jest.fn().mockResolvedValue([grant]);
    const api = createAccountApi({fetch});

    await expect(api.listFamilySharing()).resolves.toEqual([grant]);
    await api.createFamilySharing('family@example.com');
    await api.deleteFamilySharing('recipient-1');

    expect(fetch).toHaveBeenCalledWith('/account/family-sharing');
    expect(fetch).toHaveBeenCalledWith('/account/family-sharing', {
      method: 'POST',
      body: JSON.stringify({email: 'family@example.com'}),
    });
    expect(fetch).toHaveBeenCalledWith(
      '/account/family-sharing/recipient-1',
      {method: 'DELETE'},
    );
  });
});

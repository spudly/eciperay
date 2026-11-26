import {act, renderHook, waitFor} from '@testing-library/react';

import type {EciperayClient} from './createEciperayClient.js';
import {makeHookWrapper} from './test/hookTestUtils.js';
import {useAccessTokensProps} from './useAccessTokensProps.js';

const makeClient = () => {
  const account = {
    listPersonalAccessTokens: jest.fn().mockResolvedValue([
      {
        id: 'token-1',
        name: 'My token',
        tokenPrefix: 'eci_abc',
        createdAt: '2026-01-02T00:00:00.000Z',
        lastUsedAt: null,
        revokedAt: null,
      },
    ]),
    getEntitlement: jest.fn().mockResolvedValue({
      plan: 'plus',
      status: 'active',
      aiUsed: 0,
      aiLimit: 100,
      periodEndsAt: null,
      paddleCustomerId: null,
      cancelAtPeriodEnd: false,
    }),
    createPersonalAccessToken: jest
      .fn()
      .mockResolvedValue({token: 'secret-123'}),
    revokePersonalAccessToken: jest.fn().mockResolvedValue(undefined),
  };
  return {client: {account} as unknown as EciperayClient, account};
};

describe('useAccessTokensProps', () => {
  test('maps tokens and shows the Power notice below Power', async () => {
    const {client, account} = makeClient();
    const {wrapper} = makeHookWrapper();
    const {result} = renderHook(() => useAccessTokensProps(client), {wrapper});
    await waitFor(() => {
      expect(result.current.tokens).toHaveLength(1);
    });
    expect(result.current.tokens[0]).toMatchObject({
      id: 'token-1',
      name: 'My token',
      prefix: 'eci_abc',
      revoked: false,
    });
    expect(result.current.tokens[0]?.metaLabel).toContain('Never used');
    expect(result.current.planNotice).toMatch(/Power feature/);
    expect(account.listPersonalAccessTokens).toHaveBeenCalled();
  });

  test('creates and revokes tokens through the client', async () => {
    const {client, account} = makeClient();
    const {wrapper} = makeHookWrapper();
    const {result} = renderHook(() => useAccessTokensProps(client), {wrapper});
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    act(() => {
      result.current.onTokenNameChange('  New token  ');
    });
    act(() => {
      result.current.onCreate();
    });
    await waitFor(() => {
      expect(result.current.createdSecret).toBe('secret-123');
    });
    expect(account.createPersonalAccessToken).toHaveBeenCalledWith('New token');
    act(() => {
      result.current.onDismissSecret();
    });
    expect(result.current.createdSecret).toBeNull();
    act(() => {
      result.current.onRevoke('token-1');
    });
    await waitFor(() => {
      expect(account.revokePersonalAccessToken).toHaveBeenCalledWith('token-1');
    });
  });

  test('no plan notice for a Power user', async () => {
    const {client, account} = makeClient();
    account.getEntitlement.mockResolvedValue({
      plan: 'power',
      status: 'active',
      aiUsed: 0,
      aiLimit: 100,
      periodEndsAt: null,
      paddleCustomerId: null,
      cancelAtPeriodEnd: false,
    });
    const {wrapper} = makeHookWrapper();
    const {result} = renderHook(() => useAccessTokensProps(client), {wrapper});
    await waitFor(() => {
      expect(account.getEntitlement).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(result.current.planNotice).toBeNull();
    });
  });
});

import type {Entitlement} from '@eciperay/types';
import {renderHook, waitFor} from '@testing-library/react';
import {vi} from 'vitest';

import {eciperay} from '../../lib/api.js';
import {createWrapper} from '../../test/testUtils.js';

import {useAccessTokensProps} from '@eciperay/client';

// DS 14: the section is a hook returning ProfilePage's accessTokens
// data prop, so the tests assert the view-model the DS panel will
// render from (plan notice, token rows) rather than host-rendered UI.
const makeEntitlement = (plan: Entitlement['plan']): Entitlement => ({
  plan,
  status: plan === 'free' ? null : 'active',
  aiUsed: 0,
  aiLimit: 100,
  periodEndsAt: null,
  paddleCustomerId: null,
  cancelAtPeriodEnd: false,
});

describe('useAccessTokensProps', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockTokens = () => {
    vi.spyOn(eciperay.account, 'listPersonalAccessTokens').mockResolvedValue(
      [],
    );
  };

  const renderProps = (locale?: 'en-XA') => {
    const {Wrapper} = createWrapper({withAuth: false, locale});
    return renderHook(() => useAccessTokensProps(eciperay), {wrapper: Wrapper});
  };

  test('no plan notice for a Power user', async () => {
    mockTokens();
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      makeEntitlement('power'),
    );
    const {result} = renderProps();
    await waitFor(() => {
      expect(result.current.planNotice).toBeNull();
    });
    expect(result.current.tokens).toEqual([]);
  });

  test('Power explainer notice for a Free user', async () => {
    mockTokens();
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      makeEntitlement('free'),
    );
    const {result} = renderProps();
    await waitFor(() => {
      expect(result.current.planNotice).toMatch(
        /API access tokens are a Power feature/,
      );
    });
    expect(result.current.planNotice).toMatch(/You're on the Free plan/);
  });

  test('renders token meta from the en-XA Lingui catalog (#465)', async () => {
    vi.spyOn(eciperay.account, 'listPersonalAccessTokens').mockResolvedValue([
      {
        id: 'token-1',
        name: 'My token',
        tokenPrefix: 'eci_abc',
        createdAt: '2026-01-02T00:00:00.000Z',
        lastUsedAt: null,
        revokedAt: null,
      } as never,
    ]);
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      makeEntitlement('power'),
    );
    const {result} = renderProps('en-XA');
    // The full-line anchor requires the pseudo-locale marker on both
    // the created and never-used labels; English metadata fails it.
    await waitFor(() => {
      expect(result.current.tokens).toHaveLength(1);
    });
    expect(result.current.tokens[0]?.metaLabel).toMatch(
      /^Created [^~]+~ · Never used~$/,
    );
    expect(result.current.tokens[0]).toMatchObject({
      id: 'token-1',
      name: 'My token',
      prefix: 'eci_abc',
      revoked: false,
    });
  });

  test('falls back to no notice when the entitlement fails to load', async () => {
    mockTokens();
    vi.spyOn(eciperay.account, 'getEntitlement').mockRejectedValue(
      new Error('entitlement down'),
    );
    const {result} = renderProps();
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.planNotice).toBeNull();
  });
});

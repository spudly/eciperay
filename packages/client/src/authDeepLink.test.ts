import type {SupabaseClient} from '@supabase/supabase-js';

import {
  AUTH_DEEP_LINK_REDIRECT_URL,
  createSessionFromAuthDeepLink,
  isAuthDeepLinkUrl,
  parseAuthDeepLinkParams,
} from './authDeepLink.js';

describe('authDeepLink', () => {
  test('defines the mobile auth callback redirect URL', () => {
    expect(AUTH_DEEP_LINK_REDIRECT_URL).toBe('com.eciperay://auth/callback');
  });

  test('detects app auth deep links', () => {
    expect(isAuthDeepLinkUrl('com.eciperay://auth/callback?code=abc')).toBe(
      true,
    );
    expect(isAuthDeepLinkUrl('https://www.eciperay.com/reset-password')).toBe(
      false,
    );
  });

  test('parses hash and query params from callback URLs', () => {
    expect(
      parseAuthDeepLinkParams(
        'com.eciperay://auth/callback#access_token=a&refresh_token=b&type=recovery',
      ).get('access_token'),
    ).toBe('a');
    expect(
      parseAuthDeepLinkParams('com.eciperay://auth/callback?code=abc').get(
        'code',
      ),
    ).toBe('abc');
  });

  test('exchanges PKCE auth codes for a session', async () => {
    const session = {access_token: 'token'};
    const exchangeCodeForSession = jest
      .fn()
      .mockResolvedValue({data: {session}, error: null});
    const supabase = {
      auth: {exchangeCodeForSession, setSession: jest.fn()},
    } as unknown as SupabaseClient;

    await expect(
      createSessionFromAuthDeepLink(
        supabase,
        'com.eciperay://auth/callback?code=abc',
      ),
    ).resolves.toEqual({session});
    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc');
  });

  test('sets a session from implicit-flow callback tokens', async () => {
    const session = {access_token: 'token'};
    const setSession = jest
      .fn()
      .mockResolvedValue({data: {session}, error: null});
    const supabase = {
      auth: {exchangeCodeForSession: jest.fn(), setSession},
    } as unknown as SupabaseClient;

    await expect(
      createSessionFromAuthDeepLink(
        supabase,
        'com.eciperay://auth/callback#access_token=a&refresh_token=b',
      ),
    ).resolves.toEqual({session});
    expect(setSession).toHaveBeenCalledWith({
      access_token: 'a',
      refresh_token: 'b',
    });
  });
});

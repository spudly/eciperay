import type {Session} from '@supabase/supabase-js';
import {vi} from 'vitest';

// Wiring tests only: the lifecycle behavior itself is covered by the
// shared suite in @eciperay/client (authSessionLifecycle.test.ts). These
// tests verify the web host binds its own supabase/api/analytics and its
// project-scoped localStorage clear to the shared factory.

const mockSyncUser = vi.fn();
const mockIdentifyAnalyticsUserIfConsented = vi.fn();
const mockCaptureException = vi.fn();
const mockLog = vi.fn();
const mockReset = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();

vi.mock('./api.js', () => ({
  eciperay: {auth: {syncUser: () => mockSyncUser()}},
}));

vi.mock('./analytics.js', () => ({
  analytics: {
    reset: () => mockReset(),
    captureException: (error: unknown) => mockCaptureException(error),
    log: (level: string, message: string, attributes?: unknown) =>
      mockLog(level, message, attributes),
  },
  identifyAnalyticsUserIfConsented: (session: Session) =>
    mockIdentifyAnalyticsUserIfConsented(session),
}));

vi.mock('./env.js', () => ({
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
}));

vi.mock('./supabase.js', () => ({
  supabase: {
    auth: {
      signOut: (options: unknown) => mockSignOut(options),
      getSession: () => mockGetSession(),
    },
  },
}));

const session = {
  access_token: 'token-a',
  user: {id: 'user-1', email: 'test@example.com'},
} as Session;

describe('authSessionLifecycle web binding', () => {
  beforeEach(() => {
    mockSyncUser.mockReset();
    mockIdentifyAnalyticsUserIfConsented.mockReset();
    mockCaptureException.mockReset();
    mockLog.mockReset();
    mockReset.mockReset();
    mockSignOut.mockReset();
    mockSignOut.mockResolvedValue({error: null});
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue({data: {session}});
    localStorage.clear();
    vi.resetModules();
  });

  test('binds sync and consent-gated identify to the shared lifecycle', async () => {
    const {onAuthenticated, onSignedOut} = await import(
      './authSessionLifecycle.js'
    );

    await onAuthenticated(session);
    onSignedOut();

    expect(mockSyncUser).toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUserIfConsented).toHaveBeenCalledWith(session);
    expect(mockReset).toHaveBeenCalled();
  });

  test('the storage adapter round-trips localStorage', async () => {
    const {authSessionStorage} = await import('./authSessionLifecycle.js');
    localStorage.setItem('sb-test-auth-token', 'persisted-session');

    await expect(authSessionStorage.getAllKeys()).resolves.toContain(
      'sb-test-auth-token',
    );
    await expect(
      authSessionStorage.getItem('sb-test-auth-token'),
    ).resolves.toBe('persisted-session');
    await authSessionStorage.removeMany(['sb-test-auth-token']);
    expect(localStorage.getItem('sb-test-auth-token')).toBeNull();
  });

  test('a failed recovery sign-out clears only this project\u2019s persisted session', async () => {
    const {onAuthenticated} = await import('./authSessionLifecycle.js');
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mockSignOut.mockResolvedValue({error: new Error('logout failed')});
    localStorage.setItem(
      'sb-other-auth-token',
      JSON.stringify({access_token: 'other-token'}),
    );
    localStorage.setItem(
      'sb-test-auth-token',
      JSON.stringify({access_token: 'token-a'}),
    );
    localStorage.setItem('sb-test-auth-token-user', 'persisted-user');

    await expect(onAuthenticated(session)).rejects.toThrow('logout failed');

    expect(localStorage.getItem('sb-test-auth-token')).toBeNull();
    expect(localStorage.getItem('sb-test-auth-token-user')).toBeNull();
    expect(localStorage.getItem('sb-other-auth-token')).toBe(
      JSON.stringify({access_token: 'other-token'}),
    );
    expect(mockReset).toHaveBeenCalled();
  });
});

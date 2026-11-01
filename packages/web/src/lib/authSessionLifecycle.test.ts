import type {Session} from '@supabase/supabase-js';
import {vi} from 'vitest';

const mockSyncUser = vi.fn();
const mockIdentifyAnalyticsUserIfConsented = vi.fn();
const mockReset = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();

vi.mock('./api.js', () => ({
  eciperay: {auth: {syncUser: () => mockSyncUser()}},
}));

vi.mock('./analytics.js', () => ({
  analytics: {reset: () => mockReset()},
  identifyAnalyticsUserIfConsented: (session: Session) =>
    mockIdentifyAnalyticsUserIfConsented(session),
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

describe('authSessionLifecycle', () => {
  beforeEach(() => {
    mockSyncUser.mockReset();
    mockIdentifyAnalyticsUserIfConsented.mockReset();
    mockReset.mockReset();
    mockSignOut.mockReset();
    mockSignOut.mockResolvedValue({error: null});
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue({data: {session}});
    localStorage.clear();
    vi.resetModules();
  });

  test('syncs the user and identifies analytics when authenticated', async () => {
    const {onAuthenticated} = await import('./authSessionLifecycle.js');

    await onAuthenticated(session);

    expect(mockSyncUser).toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUserIfConsented).toHaveBeenCalledWith(session);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  test('resets analytics on sign out', async () => {
    const {onSignedOut} = await import('./authSessionLifecycle.js');

    onSignedOut();

    expect(mockReset).toHaveBeenCalled();
  });

  test('ends in the signed-out flow when sync rejects with the invalid-or-expired-token message (#344)', async () => {
    const {onAuthenticated} = await import('./authSessionLifecycle.js');
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));

    await expect(onAuthenticated(session)).resolves.toBeUndefined();

    expect(mockSignOut).toHaveBeenCalledWith({scope: 'local'});
    expect(mockIdentifyAnalyticsUserIfConsented).not.toHaveBeenCalled();
  });

  test('ends in the signed-out flow when sync rejects with a 401 ApiError (#344)', async () => {
    const {onAuthenticated} = await import('./authSessionLifecycle.js');
    mockSyncUser.mockRejectedValue(
      Object.assign(new Error('API error 401: /auth/sync'), {status: 401}),
    );

    await expect(onAuthenticated(session)).resolves.toBeUndefined();

    expect(mockSignOut).toHaveBeenCalledWith({scope: 'local'});
    expect(mockIdentifyAnalyticsUserIfConsented).not.toHaveBeenCalled();
  });

  test('ends in the signed-out flow when sync rejects with the invalid-token error code (#344)', async () => {
    const {onAuthenticated} = await import('./authSessionLifecycle.js');
    mockSyncUser.mockRejectedValue(
      Object.assign(new Error('Unauthorized'), {
        code: 'Invalid or expired token',
      }),
    );

    await expect(onAuthenticated(session)).resolves.toBeUndefined();

    expect(mockSignOut).toHaveBeenCalledWith({scope: 'local'});
    expect(mockIdentifyAnalyticsUserIfConsented).not.toHaveBeenCalled();
  });

  test('does not sign out a newer session when a stale token sync fails late (#344)', async () => {
    const {onAuthenticated} = await import('./authSessionLifecycle.js');
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mockGetSession.mockResolvedValue({
      data: {session: {...session, access_token: 'token-b'}},
    });

    await expect(onAuthenticated(session)).resolves.toBeUndefined();

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUserIfConsented).not.toHaveBeenCalled();
  });

  test('does not sign out again when the session is already gone (#344)', async () => {
    const {onAuthenticated} = await import('./authSessionLifecycle.js');
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mockGetSession.mockResolvedValue({data: {session: null}});

    await expect(onAuthenticated(session)).resolves.toBeUndefined();

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUserIfConsented).not.toHaveBeenCalled();
  });

  test('signs out when the current session cannot be read to prove staleness (#344)', async () => {
    const {onAuthenticated} = await import('./authSessionLifecycle.js');
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mockGetSession.mockRejectedValue(new Error('storage unavailable'));

    await expect(onAuthenticated(session)).resolves.toBeUndefined();

    expect(mockSignOut).toHaveBeenCalledWith({scope: 'local'});
    expect(mockIdentifyAnalyticsUserIfConsented).not.toHaveBeenCalled();
  });

  test('clears the persisted session and surfaces the failure when sign-out returns an error (#344)', async () => {
    const {onAuthenticated} = await import('./authSessionLifecycle.js');
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mockSignOut.mockResolvedValue({error: new Error('logout failed')});
    localStorage.setItem('sb-test-auth-token', 'persisted-session');
    localStorage.setItem('sb-test-auth-token-user', 'persisted-user');
    localStorage.setItem('unrelated-key', 'keep-me');

    await expect(onAuthenticated(session)).rejects.toThrow('logout failed');

    expect(mockSignOut).toHaveBeenCalledWith({scope: 'local'});
    expect(localStorage.getItem('sb-test-auth-token')).toBeNull();
    expect(localStorage.getItem('sb-test-auth-token-user')).toBeNull();
    expect(localStorage.getItem('unrelated-key')).toBe('keep-me');
    expect(mockReset).toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUserIfConsented).not.toHaveBeenCalled();
  });

  test('clears the persisted session and surfaces the failure when sign-out throws (#344)', async () => {
    const {onAuthenticated} = await import('./authSessionLifecycle.js');
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mockSignOut.mockRejectedValue(new Error('network'));
    localStorage.setItem('sb-test-auth-token', 'persisted-session');

    await expect(onAuthenticated(session)).rejects.toThrow('network');

    expect(mockSignOut).toHaveBeenCalledWith({scope: 'local'});
    expect(localStorage.getItem('sb-test-auth-token')).toBeNull();
    expect(mockReset).toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUserIfConsented).not.toHaveBeenCalled();
  });

  test('surfaces a generic failure when sign-out returns a non-Error error (#344)', async () => {
    const {onAuthenticated} = await import('./authSessionLifecycle.js');
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mockSignOut.mockResolvedValue({error: 'logout unavailable'});

    await expect(onAuthenticated(session)).rejects.toThrow(
      'Sign-out failed after the session token was rejected',
    );

    expect(mockReset).toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUserIfConsented).not.toHaveBeenCalled();
  });

  test('still surfaces the sign-out failure when clearing the persisted session throws (#344)', async () => {
    const {onAuthenticated} = await import('./authSessionLifecycle.js');
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mockSignOut.mockResolvedValue({error: new Error('logout failed')});
    localStorage.setItem('sb-test-auth-token', 'persisted-session');
    const removeItemSpy = vi
      .spyOn(Storage.prototype, 'removeItem')
      .mockImplementation(() => {
        throw new Error('storage unavailable');
      });

    try {
      await expect(onAuthenticated(session)).rejects.toThrow('logout failed');
    } finally {
      removeItemSpy.mockRestore();
    }

    expect(mockReset).toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUserIfConsented).not.toHaveBeenCalled();
  });

  test('rethrows sync failures that are not an invalid/expired token', async () => {
    const {onAuthenticated} = await import('./authSessionLifecycle.js');
    mockSyncUser.mockRejectedValue(
      Object.assign(new Error('API error 500: /auth/sync'), {status: 500}),
    );

    await expect(onAuthenticated(session)).rejects.toThrow(
      'API error 500: /auth/sync',
    );

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUserIfConsented).not.toHaveBeenCalled();
  });

  test('rethrows non-Error sync failures', async () => {
    const {onAuthenticated} = await import('./authSessionLifecycle.js');
    mockSyncUser.mockRejectedValue('sync failed');

    await expect(onAuthenticated(session)).rejects.toBe('sync failed');

    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

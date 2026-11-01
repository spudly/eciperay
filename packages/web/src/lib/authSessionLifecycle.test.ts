import type {Session} from '@supabase/supabase-js';
import {vi} from 'vitest';

const mockSyncUser = vi.fn();
const mockIdentifyAnalyticsUserIfConsented = vi.fn();
const mockCaptureException = vi.fn();
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
  },
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
    mockCaptureException.mockReset();
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

  test('does not delete a newer persisted session when the recovery sign-out fails (#344)', async () => {
    const {onAuthenticated} = await import('./authSessionLifecycle.js');
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));
    let resolveSignOut: (value: {error: Error}) => void = () => {};
    mockSignOut.mockImplementation(
      () =>
        new Promise<{error: Error}>(resolve => {
          resolveSignOut = resolve;
        }),
    );
    localStorage.setItem(
      'sb-test-auth-token',
      JSON.stringify({access_token: session.access_token}),
    );

    const attempt = onAuthenticated(session);
    // Let the sync failure and staleness check run so the sign-out is
    // pending, then persist a replacement session (concurrent sign-in).
    await new Promise(resolve => setTimeout(resolve, 0));
    const newerPersisted = JSON.stringify({access_token: 'newer-token'});
    localStorage.setItem('sb-test-auth-token', newerPersisted);
    resolveSignOut({error: new Error('logout failed')});

    await expect(attempt).rejects.toThrow('logout failed');

    expect(localStorage.getItem('sb-test-auth-token')).toBe(newerPersisted);
    expect(mockReset).not.toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUserIfConsented).not.toHaveBeenCalled();
  });

  test('reports a failed recovery sign-out before resetting analytics (#344)', async () => {
    const {onAuthenticated} = await import('./authSessionLifecycle.js');
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));
    const logoutFailure = new Error('logout failed');
    mockSignOut.mockResolvedValue({error: logoutFailure});
    localStorage.setItem(
      'sb-test-auth-token',
      JSON.stringify({access_token: session.access_token}),
    );

    await expect(onAuthenticated(session)).rejects.toThrow('logout failed');

    expect(mockCaptureException).toHaveBeenCalledWith(logoutFailure);
    expect(mockReset).toHaveBeenCalled();
    expect(mockCaptureException.mock.invocationCallOrder[0]).toBeLessThan(
      mockReset.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
    expect(localStorage.getItem('sb-test-auth-token')).toBeNull();
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

  test('tags a failed token-rejection recovery as an AuthSessionRejectedError (#344)', async () => {
    const {AuthSessionRejectedError} = await import('@eciperay/client');
    const {onAuthenticated} = await import('./authSessionLifecycle.js');
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mockSignOut.mockResolvedValue({error: new Error('logout failed')});

    await expect(onAuthenticated(session)).rejects.toThrow(
      AuthSessionRejectedError,
    );
    await expect(onAuthenticated(session)).rejects.toThrow('logout failed');
  });

  test('reports and rethrows sync failures that are not an invalid/expired token', async () => {
    const {onAuthenticated} = await import('./authSessionLifecycle.js');
    const failure = Object.assign(new Error('API error 500: /auth/sync'), {
      status: 500,
    });
    mockSyncUser.mockRejectedValue(failure);

    await expect(onAuthenticated(session)).rejects.toThrow(
      'API error 500: /auth/sync',
    );

    expect(mockCaptureException).toHaveBeenCalledWith(failure);
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUserIfConsented).not.toHaveBeenCalled();
  });

  test('reports and rethrows a transient 503 sync failure untagged, without signing out (#344)', async () => {
    const {AuthSessionRejectedError} = await import('@eciperay/client');
    const {onAuthenticated} = await import('./authSessionLifecycle.js');
    const failure = Object.assign(new Error('API error 503: /auth/sync'), {
      status: 503,
    });
    mockSyncUser.mockRejectedValue(failure);

    const thrown: unknown = await onAuthenticated(session).catch(
      (error: unknown) => error,
    );

    expect(thrown).toBe(failure);
    expect(thrown).not.toBeInstanceOf(AuthSessionRejectedError);
    expect(mockCaptureException).toHaveBeenCalledWith(failure);
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockReset).not.toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUserIfConsented).not.toHaveBeenCalled();
  });

  test('rethrows non-Error sync failures', async () => {
    const {onAuthenticated} = await import('./authSessionLifecycle.js');
    mockSyncUser.mockRejectedValue('sync failed');

    await expect(onAuthenticated(session)).rejects.toBe('sync failed');

    expect(mockCaptureException).toHaveBeenCalledWith('sync failed');
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

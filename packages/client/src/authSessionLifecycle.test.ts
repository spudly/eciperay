import type {Session} from '@supabase/supabase-js';

import {AuthSessionRejectedError} from './AuthProvider.js';
import {
  createAuthSessionLifecycle,
  createClearStoredSession,
  supabaseAuthStorageKeys,
  type AuthSessionLifecycle,
  type AuthSessionStorage,
} from './authSessionLifecycle.js';

const session = {
  access_token: 'token-a',
  user: {id: 'user-1', email: 'test@example.com'},
} as Session;

const createLifecycle = () => {
  const mocks = {
    syncUser: jest.fn(),
    getSession: jest.fn(),
    signOut: jest.fn(),
    reset: jest.fn(),
    captureException: jest.fn(),
    log: jest.fn(),
    identify: jest.fn(),
    clearStoredSession: jest.fn(async (_session: Session) => true),
  };
  const lifecycle: AuthSessionLifecycle = createAuthSessionLifecycle({
    supabase: {
      auth: {
        getSession: () => mocks.getSession(),
        signOut: (options: {scope: 'local'}) => mocks.signOut(options),
      },
    },
    api: {auth: {syncUser: () => mocks.syncUser()}},
    analytics: {
      reset: () => mocks.reset(),
      captureException: (error: unknown) => mocks.captureException(error),
      log: (level: string, message: string, attributes?: unknown) =>
        mocks.log(level, message, attributes),
    },
    identify: (s: Session) => mocks.identify(s),
    clearStoredSession: (s: Session) => mocks.clearStoredSession(s),
  });
  return {lifecycle, mocks};
};

describe('createAuthSessionLifecycle', () => {
  let lifecycle: AuthSessionLifecycle;
  let mocks: ReturnType<typeof createLifecycle>['mocks'];

  beforeEach(() => {
    ({lifecycle, mocks} = createLifecycle());
    mocks.signOut.mockResolvedValue({error: null});
    mocks.getSession.mockResolvedValue({data: {session}});
  });

  test('syncs the user and identifies analytics when authenticated', async () => {
    await lifecycle.onAuthenticated(session);

    expect(mocks.syncUser).toHaveBeenCalled();
    expect(mocks.identify).toHaveBeenCalledWith(session);
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  test('resets analytics on sign out', () => {
    lifecycle.onSignedOut();

    expect(mocks.reset).toHaveBeenCalled();
  });

  test('ends in the signed-out flow when sync rejects with the invalid-or-expired-token message (#344)', async () => {
    mocks.syncUser.mockRejectedValue(new Error('Invalid or expired token'));

    await expect(lifecycle.onAuthenticated(session)).resolves.toBeUndefined();

    expect(mocks.signOut).toHaveBeenCalledWith({scope: 'local'});
    expect(mocks.identify).not.toHaveBeenCalled();
  });

  test('ends in the signed-out flow when sync rejects with a 401 ApiError (#344)', async () => {
    mocks.syncUser.mockRejectedValue(
      Object.assign(new Error('API error 401: /auth/sync'), {status: 401}),
    );

    await expect(lifecycle.onAuthenticated(session)).resolves.toBeUndefined();

    expect(mocks.signOut).toHaveBeenCalledWith({scope: 'local'});
    expect(mocks.identify).not.toHaveBeenCalled();
  });

  test('ends in the signed-out flow when sync rejects with the invalid-token error code (#344)', async () => {
    mocks.syncUser.mockRejectedValue(
      Object.assign(new Error('Unauthorized'), {
        code: 'Invalid or expired token',
      }),
    );

    await expect(lifecycle.onAuthenticated(session)).resolves.toBeUndefined();

    expect(mocks.signOut).toHaveBeenCalledWith({scope: 'local'});
    expect(mocks.identify).not.toHaveBeenCalled();
  });

  test('ends in the signed-out flow when sync rejects with the missing-authorization-token message (#351)', async () => {
    mocks.syncUser.mockRejectedValue(
      new Error('Missing authorization token'),
    );

    await expect(lifecycle.onAuthenticated(session)).resolves.toBeUndefined();

    expect(mocks.signOut).toHaveBeenCalledWith({scope: 'local'});
    expect(mocks.identify).not.toHaveBeenCalled();
  });

  test('ends in the signed-out flow when sync rejects with the missing-authorization-token error code (#351)', async () => {
    mocks.syncUser.mockRejectedValue(
      Object.assign(new Error('Unauthorized'), {
        code: 'Missing authorization token',
      }),
    );

    await expect(lifecycle.onAuthenticated(session)).resolves.toBeUndefined();

    expect(mocks.signOut).toHaveBeenCalledWith({scope: 'local'});
    expect(mocks.identify).not.toHaveBeenCalled();
  });

  test('does not sign out a newer session when a stale token sync fails late (#344)', async () => {
    mocks.syncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mocks.getSession.mockResolvedValue({
      data: {session: {...session, access_token: 'token-b'}},
    });

    await expect(lifecycle.onAuthenticated(session)).resolves.toBeUndefined();

    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.identify).not.toHaveBeenCalled();
  });

  test('does not sign out again when the session is already gone (#344)', async () => {
    mocks.syncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mocks.getSession.mockResolvedValue({data: {session: null}});

    await expect(lifecycle.onAuthenticated(session)).resolves.toBeUndefined();

    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.identify).not.toHaveBeenCalled();
  });

  test('does not treat a returned getSession error as already signed out (#344)', async () => {
    mocks.syncUser.mockRejectedValue(new Error('Invalid or expired token'));
    // A failed refresh returns an error with a null session WITHOUT
    // removing the persisted session — that is a failed read, not a
    // signed-out state, so recovery must still run.
    mocks.getSession.mockResolvedValue({
      data: {session: null},
      error: new Error('refresh failed'),
    });

    await expect(lifecycle.onAuthenticated(session)).resolves.toBeUndefined();

    expect(mocks.signOut).toHaveBeenCalledWith({scope: 'local'});
    expect(mocks.identify).not.toHaveBeenCalled();
  });

  test('spares a newer session when a failed staleness read succeeds on retry (#344)', async () => {
    mocks.syncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mocks.getSession
      .mockRejectedValueOnce(new Error('storage unavailable'))
      .mockResolvedValue({
        data: {session: {...session, access_token: 'newer-token'}},
      });

    await expect(lifecycle.onAuthenticated(session)).resolves.toBeUndefined();

    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.identify).not.toHaveBeenCalled();
  });

  test('signs out when the current session cannot be read to prove staleness (#344)', async () => {
    mocks.syncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mocks.getSession.mockRejectedValue(new Error('storage unavailable'));

    await expect(lifecycle.onAuthenticated(session)).resolves.toBeUndefined();

    expect(mocks.signOut).toHaveBeenCalledWith({scope: 'local'});
    expect(mocks.identify).not.toHaveBeenCalled();
  });

  test('clears the persisted session and surfaces the failure when sign-out returns an error (#344)', async () => {
    mocks.syncUser.mockRejectedValue(new Error('Invalid or expired token'));
    const logoutFailure = new Error('logout failed');
    mocks.signOut.mockResolvedValue({error: logoutFailure});

    await expect(lifecycle.onAuthenticated(session)).rejects.toThrow(
      'logout failed',
    );

    expect(mocks.signOut).toHaveBeenCalledWith({scope: 'local'});
    expect(mocks.clearStoredSession).toHaveBeenCalledWith(session);
    // The failure is reported before the analytics reset, while the
    // failing session's identity is still attached.
    expect(mocks.captureException).toHaveBeenCalledWith(logoutFailure);
    expect(mocks.reset).toHaveBeenCalled();
    expect(mocks.captureException.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.reset.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
    expect(mocks.identify).not.toHaveBeenCalled();
  });

  test('clears the persisted session and surfaces the failure when sign-out throws (#344)', async () => {
    mocks.syncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mocks.signOut.mockRejectedValue(new Error('network'));

    await expect(lifecycle.onAuthenticated(session)).rejects.toThrow(
      'network',
    );

    expect(mocks.signOut).toHaveBeenCalledWith({scope: 'local'});
    expect(mocks.clearStoredSession).toHaveBeenCalledWith(session);
    expect(mocks.reset).toHaveBeenCalled();
    expect(mocks.identify).not.toHaveBeenCalled();
  });

  test('skips the signed-out cleanup when a replacement session owns the storage (#351)', async () => {
    mocks.syncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mocks.signOut.mockResolvedValue({error: new Error('logout failed')});
    mocks.clearStoredSession.mockResolvedValue(false);

    await expect(lifecycle.onAuthenticated(session)).rejects.toThrow(
      'logout failed',
    );

    expect(mocks.captureException).toHaveBeenCalled();
    expect(mocks.reset).not.toHaveBeenCalled();
    expect(mocks.identify).not.toHaveBeenCalled();
  });

  test('surfaces a generic failure when sign-out returns a non-Error error (#344)', async () => {
    mocks.syncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mocks.signOut.mockResolvedValue({error: 'logout unavailable'});

    await expect(lifecycle.onAuthenticated(session)).rejects.toThrow(
      'Sign-out failed after the session token was rejected',
    );

    expect(mocks.reset).toHaveBeenCalled();
    expect(mocks.identify).not.toHaveBeenCalled();
  });

  test('still surfaces the sign-out failure when clearing the persisted session throws (#344)', async () => {
    mocks.syncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mocks.signOut.mockResolvedValue({error: new Error('logout failed')});
    mocks.clearStoredSession.mockRejectedValue(
      new Error('storage unavailable'),
    );

    await expect(lifecycle.onAuthenticated(session)).rejects.toThrow(
      'logout failed',
    );

    expect(mocks.reset).toHaveBeenCalled();
    expect(mocks.identify).not.toHaveBeenCalled();
  });

  test('tags a failed token-rejection recovery as an AuthSessionRejectedError (#344)', async () => {
    mocks.syncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mocks.signOut.mockResolvedValue({error: new Error('logout failed')});

    await expect(lifecycle.onAuthenticated(session)).rejects.toThrow(
      AuthSessionRejectedError,
    );
    await expect(lifecycle.onAuthenticated(session)).rejects.toThrow(
      'logout failed',
    );
  });

  test('reports and rethrows sync failures that are not an invalid/expired token', async () => {
    const failure = Object.assign(new Error('API error 500: /auth/sync'), {
      status: 500,
    });
    mocks.syncUser.mockRejectedValue(failure);

    await expect(lifecycle.onAuthenticated(session)).rejects.toThrow(
      'API error 500: /auth/sync',
    );

    expect(mocks.captureException).toHaveBeenCalledWith(failure);
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.identify).not.toHaveBeenCalled();
  });

  test('reports and rethrows a transient 503 sync failure untagged, without signing out (#344)', async () => {
    const failure = Object.assign(new Error('API error 503: /auth/sync'), {
      status: 503,
    });
    mocks.syncUser.mockRejectedValue(failure);

    const thrown: unknown = await lifecycle.onAuthenticated(session).catch(
      (error: unknown) => error,
    );

    expect(thrown).toBe(failure);
    expect(thrown).not.toBeInstanceOf(AuthSessionRejectedError);
    expect(mocks.captureException).toHaveBeenCalledWith(failure);
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.reset).not.toHaveBeenCalled();
    expect(mocks.identify).not.toHaveBeenCalled();
  });

  test('reports and rethrows a TypeError that is not a fetch failure', async () => {
    const failure = new TypeError('cannot read properties');
    mocks.syncUser.mockRejectedValue(failure);

    await expect(lifecycle.onAuthenticated(session)).rejects.toBe(failure);

    expect(mocks.captureException).toHaveBeenCalledWith(failure);
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  test('handles a network-level sync failure without rethrowing or signing out (#378)', async () => {
    const failure = Object.assign(new Error('Network error: /auth/sync'), {
      status: 0,
    });
    mocks.syncUser.mockRejectedValue(failure);

    await expect(lifecycle.onAuthenticated(session)).resolves.toBeUndefined();

    expect(mocks.syncUser).toHaveBeenCalledTimes(2);
    expect(mocks.captureException).not.toHaveBeenCalled();
    expect(mocks.log).toHaveBeenCalledWith(
      'warn',
      'auth sync failed after one retry: network error',
      {error: 'Network error: /auth/sync'},
    );
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.reset).not.toHaveBeenCalled();
    expect(mocks.identify).not.toHaveBeenCalled();
  });

  test('retries a network-level sync failure once and reports nothing when the retry succeeds (#344)', async () => {
    const failure = Object.assign(new Error('Network error: /auth/sync'), {
      code: 'network_error',
    });
    mocks.syncUser.mockRejectedValueOnce(failure).mockResolvedValue(undefined);

    await expect(lifecycle.onAuthenticated(session)).resolves.toBeUndefined();

    expect(mocks.syncUser).toHaveBeenCalledTimes(2);
    expect(mocks.captureException).not.toHaveBeenCalled();
    expect(mocks.log).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.identify).toHaveBeenCalledWith(session);
  });

  test('handles a raw Failed to fetch sync failure the same way (#378)', async () => {
    const failure = new TypeError('Failed to fetch');
    mocks.syncUser.mockRejectedValue(failure);

    await expect(lifecycle.onAuthenticated(session)).resolves.toBeUndefined();

    expect(mocks.syncUser).toHaveBeenCalledTimes(2);
    expect(mocks.captureException).not.toHaveBeenCalled();
    expect(mocks.log).toHaveBeenCalledWith(
      'warn',
      'auth sync failed after one retry: network error',
      {error: 'Failed to fetch'},
    );
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  test('rethrows non-Error sync failures', async () => {
    mocks.syncUser.mockRejectedValue('sync failed');

    await expect(lifecycle.onAuthenticated(session)).rejects.toBe(
      'sync failed',
    );

    expect(mocks.captureException).toHaveBeenCalledWith('sync failed');
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  test('does not retry or identify a superseded session after the retry delay (#344)', async () => {
    const failure = Object.assign(new Error('Network error: /auth/sync'), {
      code: 'network_error',
      status: 0,
    });
    mocks.syncUser.mockRejectedValue(failure);
    mocks.getSession.mockResolvedValue({
      data: {session: {...session, access_token: 'token-b'}},
    });

    await expect(lifecycle.onAuthenticated(session)).resolves.toBeUndefined();

    expect(mocks.syncUser).toHaveBeenCalledTimes(1);
    expect(mocks.log).not.toHaveBeenCalled();
    expect(mocks.captureException).not.toHaveBeenCalled();
    expect(mocks.identify).not.toHaveBeenCalled();
  });

  test('does not identify a session superseded while its retry was in flight (#344)', async () => {
    const failure = Object.assign(new Error('Network error: /auth/sync'), {
      code: 'network_error',
      status: 0,
    });
    mocks.syncUser.mockRejectedValueOnce(failure).mockResolvedValue(undefined);
    mocks.getSession
      .mockResolvedValueOnce({data: {session}})
      .mockResolvedValue({
        data: {session: {...session, access_token: 'token-b'}},
      });

    await expect(lifecycle.onAuthenticated(session)).resolves.toBeUndefined();

    expect(mocks.syncUser).toHaveBeenCalledTimes(2);
    expect(mocks.identify).not.toHaveBeenCalled();
  });
});

const createMemoryStorage = (initial: Record<string, string> = {}) => {
  const map = new Map(Object.entries(initial));
  const storage: AuthSessionStorage & {
    map: Map<string, string>;
    removeMany: jest.Mock;
  } = {
    map,
    getAllKeys: jest.fn(async () => [...map.keys()]),
    getItem: jest.fn(async (key: string) => map.get(key) ?? null),
    removeMany: jest.fn(async (keys: readonly string[]) => {
      for (const key of keys) {
        map.delete(key);
      }
    }),
  };
  return storage;
};

describe('createClearStoredSession', () => {
  test('removes the persisted session keys and keeps unrelated keys (pattern scan)', async () => {
    const storage = createMemoryStorage({
      'sb-test-auth-token': 'persisted-session',
      'sb-test-auth-token-user': 'persisted-user',
      'unrelated-key': 'keep-me',
    });
    const clear = createClearStoredSession(storage);

    await expect(clear(session)).resolves.toBe(true);

    expect(storage.map.has('sb-test-auth-token')).toBe(false);
    expect(storage.map.has('sb-test-auth-token-user')).toBe(false);
    expect(storage.map.get('unrelated-key')).toBe('keep-me');
  });

  test('clears the persisted session when the stored token is still the rejected one', async () => {
    const storage = createMemoryStorage({
      'sb-test-auth-token': JSON.stringify({access_token: 'token-a'}),
      'sb-test-auth-token-user': 'persisted-user',
    });
    const clear = createClearStoredSession(storage);

    await expect(clear(session)).resolves.toBe(true);

    expect(storage.map.size).toBe(0);
  });

  test('does not clear a replacement session persisted in storage', async () => {
    const replacement = JSON.stringify({access_token: 'replacement-token'});
    const storage = createMemoryStorage({
      'sb-test-auth-token': replacement,
      'sb-test-auth-token-user': 'replacement-user',
    });
    const clear = createClearStoredSession(storage);

    await expect(clear(session)).resolves.toBe(false);

    expect(storage.map.get('sb-test-auth-token')).toBe(replacement);
    expect(storage.map.get('sb-test-auth-token-user')).toBe(
      'replacement-user',
    );
    expect(storage.removeMany).not.toHaveBeenCalled();
  });

  test('aborts cleanup when a replacement session is persisted between the identity read and removal', async () => {
    const baseline = JSON.stringify({access_token: 'token-a'});
    const storage = createMemoryStorage({
      'sb-test-auth-token': baseline,
    });
    let getItemCalls = 0;
    storage.getItem = jest.fn(async () => {
      getItemCalls += 1;
      return getItemCalls === 1
        ? baseline
        : JSON.stringify({access_token: 'replacement-token'});
    });
    const clear = createClearStoredSession(storage);

    await expect(clear(session)).resolves.toBe(false);

    expect(storage.removeMany).not.toHaveBeenCalled();
    expect(storage.map.get('sb-test-auth-token')).toBe(baseline);
  });

  test('removes an unparseable stored value', async () => {
    const storage = createMemoryStorage({
      'sb-test-auth-token': 'not-json{',
    });
    const clear = createClearStoredSession(storage);

    await expect(clear(session)).resolves.toBe(true);

    expect(storage.map.size).toBe(0);
  });

  test('removes a stored value that carries no access token', async () => {
    const storage = createMemoryStorage({
      'sb-test-auth-token': JSON.stringify({foo: 1}),
    });
    const clear = createClearStoredSession(storage);

    await expect(clear(session)).resolves.toBe(true);

    expect(storage.map.size).toBe(0);
  });

  test('removes a stored value whose access token is not a string', async () => {
    const storage = createMemoryStorage({
      'sb-test-auth-token': JSON.stringify({access_token: 123}),
    });
    const clear = createClearStoredSession(storage);

    await expect(clear(session)).resolves.toBe(true);

    expect(storage.map.size).toBe(0);
  });

  test('removes a stored value that parses to null', async () => {
    const storage = createMemoryStorage({
      'sb-test-auth-token': 'null',
    });
    const clear = createClearStoredSession(storage);

    await expect(clear(session)).resolves.toBe(true);

    expect(storage.map.size).toBe(0);
  });

  test('removes a lone -user companion key when no main key is stored', async () => {
    const storage = createMemoryStorage({
      'sb-test-auth-token-user': 'persisted-user',
    });
    const clear = createClearStoredSession(storage);

    await expect(clear(session)).resolves.toBe(true);

    expect(storage.map.size).toBe(0);
  });

  test('resolves true when no auth keys are stored', async () => {
    const storage = createMemoryStorage({'unrelated-key': 'keep-me'});
    const clear = createClearStoredSession(storage);

    await expect(clear(session)).resolves.toBe(true);

    expect(storage.removeMany).not.toHaveBeenCalled();
    expect(storage.map.get('unrelated-key')).toBe('keep-me');
  });

  test('resolves true when listing the storage keys fails', async () => {
    const storage = createMemoryStorage();
    storage.getAllKeys = jest.fn(async () => {
      throw new Error('storage unavailable');
    });
    const clear = createClearStoredSession(storage);

    await expect(clear(session)).resolves.toBe(true);
  });

  test('resolves true when removing the keys fails', async () => {
    const storage = createMemoryStorage({
      'sb-test-auth-token': 'persisted-session',
    });
    storage.removeMany = jest.fn(async () => {
      throw new Error('storage unavailable');
    });
    const clear = createClearStoredSession(storage);

    await expect(clear(session)).resolves.toBe(true);
  });

  test('scopes the clear to the given project keys when own keys are provided', async () => {
    const other = JSON.stringify({access_token: 'other-token'});
    const storage = createMemoryStorage({
      'sb-other-auth-token': other,
      'sb-other-auth-token-user': 'other-user',
      'sb-test-auth-token': JSON.stringify({access_token: 'token-a'}),
      'sb-test-auth-token-user': 'persisted-user',
    });
    const clear = createClearStoredSession(storage, [
      'sb-test-auth-token',
      'sb-test-auth-token-user',
    ]);

    await expect(clear(session)).resolves.toBe(true);

    expect(storage.map.has('sb-test-auth-token')).toBe(false);
    expect(storage.map.has('sb-test-auth-token-user')).toBe(false);
    expect(storage.map.get('sb-other-auth-token')).toBe(other);
    expect(storage.map.get('sb-other-auth-token-user')).toBe('other-user');
  });

  test('with own keys, removes a present companion key when the main key is absent', async () => {
    const storage = createMemoryStorage({
      'sb-test-auth-token-user': 'persisted-user',
    });
    const clear = createClearStoredSession(storage, [
      'sb-test-auth-token',
      'sb-test-auth-token-user',
    ]);

    await expect(clear(session)).resolves.toBe(true);

    expect(storage.map.size).toBe(0);
  });

  test('with own keys, spares a replacement session stored under the main key', async () => {
    const replacement = JSON.stringify({access_token: 'replacement-token'});
    const storage = createMemoryStorage({
      'sb-test-auth-token': replacement,
    });
    const clear = createClearStoredSession(storage, [
      'sb-test-auth-token',
      'sb-test-auth-token-user',
    ]);

    await expect(clear(session)).resolves.toBe(false);

    expect(storage.map.get('sb-test-auth-token')).toBe(replacement);
    expect(storage.removeMany).not.toHaveBeenCalled();
  });

  test('with null own keys, falls back to the pattern scan and removes nothing when no auth keys are stored', async () => {
    const storage = createMemoryStorage({'unrelated-key': 'keep-me'});
    const clear = createClearStoredSession(storage, null);

    await expect(clear(session)).resolves.toBe(true);

    expect(storage.removeMany).not.toHaveBeenCalled();
  });
});

describe('supabaseAuthStorageKeys', () => {
  test('derives the main and companion keys from the project URL', () => {
    expect(supabaseAuthStorageKeys('https://test.supabase.co')).toEqual([
      'sb-test-auth-token',
      'sb-test-auth-token-user',
    ]);
  });

  test('returns null for an unparseable URL', () => {
    expect(supabaseAuthStorageKeys('not a url')).toBeNull();
  });

  test('returns null when the URL has no project ref', () => {
    expect(supabaseAuthStorageKeys('file:///session')).toBeNull();
  });
});

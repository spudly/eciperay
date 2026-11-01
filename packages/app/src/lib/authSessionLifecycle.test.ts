import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Session} from '@supabase/supabase-js';

const mockSyncUser = jest.fn();
const mockIdentifyAnalyticsUser = jest.fn();
const mockCaptureException = jest.fn();
const mockReset = jest.fn();
const mockSignOut = jest.fn();
const mockGetSession = jest.fn();

jest.mock('./api', () => ({api: {auth: {syncUser: () => mockSyncUser()}}}));

jest.mock('./analytics', () => ({
  analytics: {
    reset: () => mockReset(),
    captureException: (error: unknown) => mockCaptureException(error),
  },
}));

jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      signOut: (options: unknown) => mockSignOut(options),
      getSession: () => mockGetSession(),
    },
  },
}));

jest.mock('@eciperay/client', () => {
  class MockAuthSessionRejectedError extends Error {
    constructor(message: string, options?: {cause?: unknown}) {
      super(message, options);
      this.name = 'AuthSessionRejectedError';
    }
  }
  return {
    AuthSessionRejectedError: MockAuthSessionRejectedError,
    identifyAnalyticsUser: (analytics: unknown, session: Session) =>
      mockIdentifyAnalyticsUser(analytics, session),
  };
});

import {AuthSessionRejectedError} from '@eciperay/client';

import {analytics} from './analytics';
import {onAuthenticated, onSignedOut} from './authSessionLifecycle';

const session = {
  access_token: 'token-a',
  user: {id: 'user-1', email: 'test@example.com'},
} as Session;

describe('authSessionLifecycle', () => {
  beforeEach(async () => {
    mockSyncUser.mockReset();
    mockIdentifyAnalyticsUser.mockReset();
    mockCaptureException.mockReset();
    mockReset.mockReset();
    mockSignOut.mockReset();
    mockSignOut.mockResolvedValue({error: null});
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue({data: {session}});
    await AsyncStorage.clear();
  });

  test('syncs the user and identifies analytics when authenticated', async () => {
    mockSyncUser.mockResolvedValue(undefined);

    await onAuthenticated(session);

    expect(mockSyncUser).toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUser).toHaveBeenCalledWith(analytics, session);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  test('resets analytics on sign out', () => {
    onSignedOut();

    expect(mockReset).toHaveBeenCalled();
  });

  test('ends in the signed-out flow when sync rejects with the invalid-or-expired-token message (#351)', async () => {
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));

    await expect(onAuthenticated(session)).resolves.toBeUndefined();

    expect(mockSignOut).toHaveBeenCalledWith({scope: 'local'});
    expect(mockIdentifyAnalyticsUser).not.toHaveBeenCalled();
  });

  test('ends in the signed-out flow when sync rejects with a 401 ApiError (#351)', async () => {
    mockSyncUser.mockRejectedValue(
      Object.assign(new Error('API error 401: /auth/sync'), {status: 401}),
    );

    await expect(onAuthenticated(session)).resolves.toBeUndefined();

    expect(mockSignOut).toHaveBeenCalledWith({scope: 'local'});
    expect(mockIdentifyAnalyticsUser).not.toHaveBeenCalled();
  });

  test('ends in the signed-out flow when sync rejects with the invalid-token error code (#351)', async () => {
    mockSyncUser.mockRejectedValue(
      Object.assign(new Error('Unauthorized'), {
        code: 'Invalid or expired token',
      }),
    );

    await expect(onAuthenticated(session)).resolves.toBeUndefined();

    expect(mockSignOut).toHaveBeenCalledWith({scope: 'local'});
    expect(mockIdentifyAnalyticsUser).not.toHaveBeenCalled();
  });

  test('ends in the signed-out flow when sync rejects with the missing-authorization-token message (#351)', async () => {
    mockSyncUser.mockRejectedValue(new Error('Missing authorization token'));

    await expect(onAuthenticated(session)).resolves.toBeUndefined();

    expect(mockSignOut).toHaveBeenCalledWith({scope: 'local'});
    expect(mockIdentifyAnalyticsUser).not.toHaveBeenCalled();
  });

  test('ends in the signed-out flow when sync rejects with the missing-authorization-token error code (#351)', async () => {
    mockSyncUser.mockRejectedValue(
      Object.assign(new Error('Unauthorized'), {
        code: 'Missing authorization token',
      }),
    );

    await expect(onAuthenticated(session)).resolves.toBeUndefined();

    expect(mockSignOut).toHaveBeenCalledWith({scope: 'local'});
    expect(mockIdentifyAnalyticsUser).not.toHaveBeenCalled();
  });

  test('does not sign out a newer session when a stale token sync fails late (#351)', async () => {
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mockGetSession.mockResolvedValue({
      data: {session: {...session, access_token: 'token-b'}},
    });

    await expect(onAuthenticated(session)).resolves.toBeUndefined();

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUser).not.toHaveBeenCalled();
  });

  test('does not sign out again when the session is already gone (#351)', async () => {
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mockGetSession.mockResolvedValue({data: {session: null}});

    await expect(onAuthenticated(session)).resolves.toBeUndefined();

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUser).not.toHaveBeenCalled();
  });

  test('signs out when the current session cannot be read to prove staleness (#351)', async () => {
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mockGetSession.mockRejectedValue(new Error('storage unavailable'));

    await expect(onAuthenticated(session)).resolves.toBeUndefined();

    expect(mockSignOut).toHaveBeenCalledWith({scope: 'local'});
    expect(mockIdentifyAnalyticsUser).not.toHaveBeenCalled();
  });

  test('clears the persisted session and surfaces the failure when sign-out returns an error (#351)', async () => {
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mockSignOut.mockResolvedValue({error: new Error('logout failed')});
    await AsyncStorage.setItem('sb-test-auth-token', 'persisted-session');
    await AsyncStorage.setItem('sb-test-auth-token-user', 'persisted-user');
    await AsyncStorage.setItem('unrelated-key', 'keep-me');

    await expect(onAuthenticated(session)).rejects.toThrow('logout failed');

    expect(mockSignOut).toHaveBeenCalledWith({scope: 'local'});
    await expect(
      AsyncStorage.getItem('sb-test-auth-token'),
    ).resolves.toBeNull();
    await expect(
      AsyncStorage.getItem('sb-test-auth-token-user'),
    ).resolves.toBeNull();
    await expect(AsyncStorage.getItem('unrelated-key')).resolves.toBe(
      'keep-me',
    );
    expect(mockReset).toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUser).not.toHaveBeenCalled();
  });

  test('does not clear a replacement session persisted during sign-out recovery (#351)', async () => {
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mockSignOut.mockResolvedValue({error: new Error('logout failed')});
    const replacement = JSON.stringify({access_token: 'replacement-token'});
    await AsyncStorage.setItem('sb-test-auth-token', replacement);
    await AsyncStorage.setItem('sb-test-auth-token-user', 'replacement-user');

    await expect(onAuthenticated(session)).rejects.toThrow('logout failed');

    await expect(AsyncStorage.getItem('sb-test-auth-token')).resolves.toBe(
      replacement,
    );
    await expect(AsyncStorage.getItem('sb-test-auth-token-user')).resolves.toBe(
      'replacement-user',
    );
    expect(mockReset).not.toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUser).not.toHaveBeenCalled();
  });

  test('clears the persisted session when the stored token is still the rejected one (#351)', async () => {
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mockSignOut.mockResolvedValue({error: new Error('logout failed')});
    await AsyncStorage.setItem(
      'sb-test-auth-token',
      JSON.stringify({access_token: session.access_token}),
    );
    await AsyncStorage.setItem('sb-test-auth-token-user', 'persisted-user');

    await expect(onAuthenticated(session)).rejects.toThrow('logout failed');

    await expect(
      AsyncStorage.getItem('sb-test-auth-token'),
    ).resolves.toBeNull();
    await expect(
      AsyncStorage.getItem('sb-test-auth-token-user'),
    ).resolves.toBeNull();
    expect(mockReset).toHaveBeenCalled();
  });

  test('clears the persisted session and surfaces the failure when sign-out throws (#351)', async () => {
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mockSignOut.mockRejectedValue(new Error('network'));
    await AsyncStorage.setItem('sb-test-auth-token', 'persisted-session');

    await expect(onAuthenticated(session)).rejects.toThrow('network');

    expect(mockSignOut).toHaveBeenCalledWith({scope: 'local'});
    await expect(
      AsyncStorage.getItem('sb-test-auth-token'),
    ).resolves.toBeNull();
    expect(mockReset).toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUser).not.toHaveBeenCalled();
  });

  test('surfaces a generic failure when sign-out returns a non-Error error (#351)', async () => {
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mockSignOut.mockResolvedValue({error: 'logout unavailable'});

    await expect(onAuthenticated(session)).rejects.toThrow(
      'Sign-out failed after the session token was rejected',
    );

    expect(mockReset).toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUser).not.toHaveBeenCalled();
  });

  test('still surfaces the sign-out failure when clearing the persisted session fails (#351)', async () => {
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mockSignOut.mockResolvedValue({error: new Error('logout failed')});
    const getAllKeysSpy = jest
      .spyOn(AsyncStorage, 'getAllKeys')
      .mockRejectedValue(new Error('storage unavailable'));

    try {
      await expect(onAuthenticated(session)).rejects.toThrow('logout failed');
    } finally {
      getAllKeysSpy.mockRestore();
    }

    expect(mockReset).toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUser).not.toHaveBeenCalled();
  });

  test('tags a failed token-rejection recovery as an AuthSessionRejectedError (#351)', async () => {
    const signOutError = new Error('logout failed');
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mockSignOut.mockResolvedValue({error: signOutError});

    await expect(onAuthenticated(session)).rejects.toThrow(
      AuthSessionRejectedError,
    );
    await expect(onAuthenticated(session)).rejects.toThrow('logout failed');
    expect(mockCaptureException).toHaveBeenCalledWith(signOutError);
  });

  test('reports and rethrows sync failures that are not an invalid/expired token', async () => {
    const failure = Object.assign(new Error('API error 500: /auth/sync'), {
      status: 500,
    });
    mockSyncUser.mockRejectedValue(failure);

    await expect(onAuthenticated(session)).rejects.toThrow(
      'API error 500: /auth/sync',
    );

    expect(mockCaptureException).toHaveBeenCalledWith(failure);
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUser).not.toHaveBeenCalled();
  });

  test('reports and rethrows a transient 503 sync failure untagged, without signing out (#351)', async () => {
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
    expect(mockIdentifyAnalyticsUser).not.toHaveBeenCalled();
  });

  test('rethrows non-Error sync failures', async () => {
    mockSyncUser.mockRejectedValue('sync failed');

    await expect(onAuthenticated(session)).rejects.toBe('sync failed');

    expect(mockCaptureException).toHaveBeenCalledWith('sync failed');
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

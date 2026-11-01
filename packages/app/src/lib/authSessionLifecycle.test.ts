import type {Session} from '@supabase/supabase-js';

const mockSyncUser = jest.fn();
const mockIdentifyAnalyticsUser = jest.fn();
const mockReset = jest.fn();
const mockSignOut = jest.fn();

jest.mock('./api', () => ({
  api: {auth: {syncUser: () => mockSyncUser()}},
}));

jest.mock('./analytics', () => ({
  analytics: {reset: () => mockReset()},
}));

jest.mock('./supabase', () => ({
  supabase: {auth: {signOut: () => mockSignOut()}},
}));

jest.mock('@eciperay/client', () => ({
  identifyAnalyticsUser: (analytics: unknown, session: Session) =>
    mockIdentifyAnalyticsUser(analytics, session),
}));

import {analytics} from './analytics';
import {onAuthenticated, onSignedOut} from './authSessionLifecycle';

const session = {
  user: {id: 'user-1', email: 'test@example.com'},
} as Session;

describe('authSessionLifecycle', () => {
  beforeEach(() => {
    mockSyncUser.mockReset();
    mockIdentifyAnalyticsUser.mockReset();
    mockReset.mockReset();
    mockSignOut.mockReset();
    mockSignOut.mockResolvedValue({error: null});
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

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUser).not.toHaveBeenCalled();
  });

  test('ends in the signed-out flow when sync rejects with a 401 ApiError (#351)', async () => {
    mockSyncUser.mockRejectedValue(
      Object.assign(new Error('API error 401: /auth/sync'), {status: 401}),
    );

    await expect(onAuthenticated(session)).resolves.toBeUndefined();

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUser).not.toHaveBeenCalled();
  });

  test('ends in the signed-out flow when sync rejects with the invalid-token error code (#351)', async () => {
    mockSyncUser.mockRejectedValue(
      Object.assign(new Error('Unauthorized'), {
        code: 'Invalid or expired token',
      }),
    );

    await expect(onAuthenticated(session)).resolves.toBeUndefined();

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUser).not.toHaveBeenCalled();
  });

  test('still resets analytics when the expired-token sign-out itself fails (#351)', async () => {
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mockSignOut.mockRejectedValue(new Error('network'));

    await expect(onAuthenticated(session)).resolves.toBeUndefined();

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockReset).toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUser).not.toHaveBeenCalled();
  });

  test('rethrows sync failures that are not an invalid/expired token', async () => {
    mockSyncUser.mockRejectedValue(
      Object.assign(new Error('API error 500: /auth/sync'), {status: 500}),
    );

    await expect(onAuthenticated(session)).rejects.toThrow(
      'API error 500: /auth/sync',
    );

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUser).not.toHaveBeenCalled();
  });

  test('rethrows non-Error sync failures', async () => {
    mockSyncUser.mockRejectedValue('sync failed');

    await expect(onAuthenticated(session)).rejects.toBe('sync failed');

    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

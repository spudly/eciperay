import type {Session} from '@supabase/supabase-js';
import {vi} from 'vitest';

const mockSyncUser = vi.fn();
const mockIdentifyAnalyticsUserIfConsented = vi.fn();
const mockReset = vi.fn();
const mockSignOut = vi.fn();

vi.mock('./api.js', () => ({
  eciperay: {auth: {syncUser: () => mockSyncUser()}},
}));

vi.mock('./analytics.js', () => ({
  analytics: {reset: () => mockReset()},
  identifyAnalyticsUserIfConsented: (session: Session) =>
    mockIdentifyAnalyticsUserIfConsented(session),
}));

vi.mock('./supabase.js', () => ({
  supabase: {auth: {signOut: () => mockSignOut()}},
}));

const session = {user: {id: 'user-1', email: 'test@example.com'}} as Session;

describe('authSessionLifecycle', () => {
  beforeEach(() => {
    mockSyncUser.mockReset();
    mockIdentifyAnalyticsUserIfConsented.mockReset();
    mockReset.mockReset();
    mockSignOut.mockReset();
    mockSignOut.mockResolvedValue({error: null});
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

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUserIfConsented).not.toHaveBeenCalled();
  });

  test('ends in the signed-out flow when sync rejects with a 401 ApiError (#344)', async () => {
    const {onAuthenticated} = await import('./authSessionLifecycle.js');
    mockSyncUser.mockRejectedValue(
      Object.assign(new Error('API error 401: /auth/sync'), {status: 401}),
    );

    await expect(onAuthenticated(session)).resolves.toBeUndefined();

    expect(mockSignOut).toHaveBeenCalled();
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

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUserIfConsented).not.toHaveBeenCalled();
  });

  test('still resets analytics when the expired-token sign-out itself fails (#344)', async () => {
    const {onAuthenticated} = await import('./authSessionLifecycle.js');
    mockSyncUser.mockRejectedValue(new Error('Invalid or expired token'));
    mockSignOut.mockRejectedValue(new Error('network'));

    await expect(onAuthenticated(session)).resolves.toBeUndefined();

    expect(mockSignOut).toHaveBeenCalled();
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

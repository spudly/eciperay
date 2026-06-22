import type {Session} from '@supabase/supabase-js';
import {vi} from 'vitest';

const mockSyncUser = vi.fn();
const mockIdentifyAnalyticsUserIfConsented = vi.fn();
const mockReset = vi.fn();

vi.mock('./api.js', () => ({
  eciperay: {auth: {syncUser: () => mockSyncUser()}},
}));

vi.mock('./analytics.js', () => ({
  analytics: {reset: () => mockReset()},
  identifyAnalyticsUserIfConsented: (session: Session) =>
    mockIdentifyAnalyticsUserIfConsented(session),
}));

describe('authSessionLifecycle', () => {
  beforeEach(() => {
    mockSyncUser.mockReset();
    mockIdentifyAnalyticsUserIfConsented.mockReset();
    mockReset.mockReset();
    vi.resetModules();
  });

  test('syncs the user and identifies analytics when authenticated', async () => {
    const {onAuthenticated} = await import('./authSessionLifecycle.js');
    const session = {
      user: {id: 'user-1', email: 'test@example.com'},
    } as Session;

    await onAuthenticated(session);

    expect(mockSyncUser).toHaveBeenCalled();
    expect(mockIdentifyAnalyticsUserIfConsented).toHaveBeenCalledWith(session);
  });

  test('resets analytics on sign out', async () => {
    const {onSignedOut} = await import('./authSessionLifecycle.js');

    onSignedOut();

    expect(mockReset).toHaveBeenCalled();
  });
});

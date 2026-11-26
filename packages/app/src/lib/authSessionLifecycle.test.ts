import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Session} from '@supabase/supabase-js';

// Wiring tests only: the lifecycle behavior itself is covered by the
// shared suite in @eciperay/client (authSessionLifecycle.test.ts). These
// tests verify the app host binds its own supabase/api/analytics and its
// AsyncStorage clear to the shared factory.

const mockOnAuthenticated = jest.fn();
const mockOnSignedOut = jest.fn();
const mockCreateAuthSessionLifecycle = jest.fn((_bindings: unknown) => ({
  onAuthenticated: mockOnAuthenticated,
  onSignedOut: mockOnSignedOut,
}));
const mockClearStoredSession = jest.fn();
const mockCreateClearStoredSession = jest.fn(
  (_storage: unknown) => mockClearStoredSession,
);
const mockIdentifyAnalyticsUser = jest.fn();

jest.mock('@eciperay/client', () => ({
  createAuthSessionLifecycle: (bindings: unknown) =>
    mockCreateAuthSessionLifecycle(bindings),
  createClearStoredSession: (storage: unknown) =>
    mockCreateClearStoredSession(storage),
  identifyAnalyticsUser: (analytics: unknown, session: Session) =>
    mockIdentifyAnalyticsUser(analytics, session),
}));

jest.mock('./api', () => ({
  api: {auth: {syncUser: jest.fn()}},
}));

jest.mock('./analytics', () => ({
  analytics: {reset: jest.fn(), captureException: jest.fn(), log: jest.fn()},
}));

jest.mock('./supabase', () => ({
  supabase: {auth: {getSession: jest.fn(), signOut: jest.fn()}},
}));

// Required lazily (after the mock factories above are registered and the
// mock* consts are initialized): a static import of the module under test
// would run the '@eciperay/client' factory before mockCreateClearStoredSession
// is assigned, failing with "mockCreateClearStoredSession is not a function".
// Same pattern as supabase.test.ts.
const {analytics} = require('./analytics') as typeof import('./analytics');
const {api} = require('./api') as typeof import('./api');
const {authSessionStorage, onAuthenticated, onSignedOut} =
  require('./authSessionLifecycle') as typeof import('./authSessionLifecycle');
const {supabase} = require('./supabase') as typeof import('./supabase');

const session = {
  access_token: 'token-a',
  user: {id: 'user-1', email: 'test@example.com'},
} as Session;

describe('authSessionLifecycle app binding', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('exports the lifecycle built by the shared factory', () => {
    expect(onAuthenticated).toBe(mockOnAuthenticated);
    expect(onSignedOut).toBe(mockOnSignedOut);
  });

  test('binds the app supabase, api, analytics, and clear to the factory', () => {
    expect(mockCreateClearStoredSession).toHaveBeenCalledWith(
      authSessionStorage,
    );
    expect(mockCreateAuthSessionLifecycle).toHaveBeenCalledWith(
      expect.objectContaining({
        supabase,
        api,
        analytics,
        clearStoredSession: mockClearStoredSession,
      }),
    );
  });

  test('the identify binding identifies through the app analytics', () => {
    const bindings = mockCreateAuthSessionLifecycle.mock.calls[0]?.[0] as {
      identify: (s: Session) => void;
    };

    bindings.identify(session);

    expect(mockIdentifyAnalyticsUser).toHaveBeenCalledWith(analytics, session);
  });

  test('the storage adapter delegates to AsyncStorage', async () => {
    await AsyncStorage.setItem('sb-test-auth-token', 'persisted-session');

    await expect(authSessionStorage.getAllKeys()).resolves.toContain(
      'sb-test-auth-token',
    );
    await expect(authSessionStorage.getItem('sb-test-auth-token')).resolves.toBe(
      'persisted-session',
    );
    await authSessionStorage.removeMany(['sb-test-auth-token']);
    await expect(AsyncStorage.getItem('sb-test-auth-token')).resolves.toBeNull();
  });
});

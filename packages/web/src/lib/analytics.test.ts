import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  readAnalyticsConsent,
  subscribeAnalyticsConsent,
} from '@eciperay/client';
import {vi} from 'vitest';

const {mockEnablePostHog, mockDisablePostHog, mockIdentifyAnalyticsUser} =
  vi.hoisted(() => ({
    mockEnablePostHog: vi.fn(),
    mockDisablePostHog: vi.fn(),
    mockIdentifyAnalyticsUser: vi.fn(),
  }));

vi.mock('@eciperay/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@eciperay/client')>();
  return {
    ...actual,
    identifyAnalyticsUser: mockIdentifyAnalyticsUser,
    readAnalyticsConsent: vi.fn(actual.readAnalyticsConsent),
  };
});

vi.mock('./createDeferredWebAnalytics.js', () => ({
  createDeferredWebAnalytics: () => ({
    analytics: {platform: 'web'},
    enablePostHog: mockEnablePostHog,
    disablePostHog: mockDisablePostHog,
  }),
}));

describe('analytics', () => {
  beforeEach(() => {
    mockEnablePostHog.mockClear();
    mockIdentifyAnalyticsUser.mockClear();
    vi.resetModules();
  });

  test('exports the configured client instance', async () => {
    const {analytics} = await import('./analytics.js');
    expect(analytics.platform).toBe('web');
  });

  test('enables PostHog when consent was previously accepted', async () => {
    vi.mocked(readAnalyticsConsent).mockReturnValue('accepted');
    await import('./analytics.js');
    expect(mockEnablePostHog).toHaveBeenCalled();
  });

  test('disables PostHog when consent is declined in another tab', async () => {
    vi.mocked(readAnalyticsConsent).mockReturnValue('accepted');
    await import('./analytics.js');
    mockDisablePostHog.mockClear();

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: ANALYTICS_CONSENT_STORAGE_KEY,
        newValue: 'declined',
      }),
    );

    expect(mockDisablePostHog).toHaveBeenCalled();
  });

  test('disables PostHog when consent is withdrawn in another tab', async () => {
    vi.mocked(readAnalyticsConsent).mockReturnValue('accepted');
    await import('./analytics.js');
    mockDisablePostHog.mockClear();

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: ANALYTICS_CONSENT_STORAGE_KEY,
        newValue: null,
      }),
    );

    expect(mockDisablePostHog).toHaveBeenCalled();
  });

  test('notifies consent subscribers when another tab changes consent', async () => {
    await import('./analytics.js');
    const listener = vi.fn();
    const unsubscribe = subscribeAnalyticsConsent(listener);

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: ANALYTICS_CONSENT_STORAGE_KEY,
        newValue: 'declined',
      }),
    );
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: ANALYTICS_CONSENT_STORAGE_KEY,
        newValue: null,
      }),
    );

    // The banner and preferences surfaces subscribe through the same
    // registry; a storage handler that only flipped PostHog directly
    // would leave them stale, which this pins against. (Exact call
    // counts are not asserted: earlier tests in this file re-import the
    // module, and each import leaves a storage listener behind, so one
    // event can notify once per import — the delivered values are the
    // contract.)
    expect(listener.mock.calls[0]).toEqual(['declined']);
    expect(listener).toHaveBeenCalledWith(null);
    unsubscribe();
  });

  test('enables PostHog when consent is accepted in another tab', async () => {
    vi.mocked(readAnalyticsConsent).mockReturnValue('declined');
    await import('./analytics.js');
    mockEnablePostHog.mockClear();

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: ANALYTICS_CONSENT_STORAGE_KEY,
        newValue: 'accepted',
      }),
    );

    expect(mockEnablePostHog).toHaveBeenCalled();
  });

  test('ignores storage events for other keys', async () => {
    vi.mocked(readAnalyticsConsent).mockReturnValue('accepted');
    await import('./analytics.js');
    mockDisablePostHog.mockClear();

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'eciperay.somethingElse',
        newValue: 'declined',
      }),
    );

    expect(mockDisablePostHog).not.toHaveBeenCalled();
  });

  test('identifies the user when consent was accepted', async () => {
    vi.mocked(readAnalyticsConsent).mockReturnValue('accepted');
    const {identifyAnalyticsUserIfConsented} = await import('./analytics.js');
    const session = {
      user: {id: 'user-1', email: 'test@example.com'},
    } as import('@supabase/supabase-js').Session;

    identifyAnalyticsUserIfConsented(session);

    expect(mockIdentifyAnalyticsUser).toHaveBeenCalledWith(
      expect.objectContaining({platform: 'web'}),
      session,
    );
  });

  test('skips identify when consent was declined', async () => {
    vi.mocked(readAnalyticsConsent).mockReturnValue('declined');
    const {identifyAnalyticsUserIfConsented} = await import('./analytics.js');
    const session = {
      user: {id: 'user-1', email: 'test@example.com'},
    } as import('@supabase/supabase-js').Session;

    identifyAnalyticsUserIfConsented(session);

    expect(mockIdentifyAnalyticsUser).not.toHaveBeenCalled();
  });
});

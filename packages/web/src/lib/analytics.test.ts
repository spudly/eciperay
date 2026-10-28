import {readAnalyticsConsent} from '@eciperay/client';
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

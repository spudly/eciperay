import {readAnalyticsConsent} from '@eciperay/client';
import {vi} from 'vitest';

const mockEnablePostHog = vi.fn();

vi.mock('@eciperay/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@eciperay/client')>();
  return {...actual, readAnalyticsConsent: vi.fn(actual.readAnalyticsConsent)};
});

vi.mock('./createDeferredWebAnalytics.js', () => ({
  createDeferredWebAnalytics: () => ({
    analytics: {platform: 'web'},
    enablePostHog: mockEnablePostHog,
  }),
}));

describe('analytics', () => {
  beforeEach(() => {
    mockEnablePostHog.mockClear();
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
});

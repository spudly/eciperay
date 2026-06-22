import {screen} from '@testing-library/react';
import {vi} from 'vitest';

import {renderWithProviders} from '../test/testUtils.js';

vi.mock('../lib/analytics.js', () => ({
  analytics: {identifyUser: vi.fn()},
  enablePostHog: vi.fn(),
}));

vi.mock('../lib/env.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../lib/env.js')>();
  return {...actual, POSTHOG_KEY: ''};
});

const {AnalyticsConsentBanner} = await import('./AnalyticsConsentBanner.js');

describe('AnalyticsConsentBanner without PostHog', () => {
  test('does not render when analytics is not configured', async () => {
    await renderWithProviders(<AnalyticsConsentBanner />, {withAuth: false});
    expect(
      screen.queryByRole('dialog', {name: /cookie and analytics consent/i}),
    ).not.toBeInTheDocument();
  });
});

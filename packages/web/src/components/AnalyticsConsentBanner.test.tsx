import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {renderWithProviders} from '../test/testUtils.js';

import {AnalyticsConsentBanner} from './AnalyticsConsentBanner.js';

const {mockEnablePostHog, mockIdentify} = vi.hoisted(() => ({
  mockEnablePostHog: vi.fn(),
  mockIdentify: vi.fn(),
}));

vi.mock('../lib/analytics.js', () => ({
  analytics: {identifyUser: mockIdentify},
  enablePostHog: () => mockEnablePostHog(),
}));

vi.mock('../lib/env.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../lib/env.js')>();
  return {
    ...actual,
    POSTHOG_KEY: 'phc_test',
    POSTHOG_HOST: 'https://us.i.posthog.com',
  };
});

describe('AnalyticsConsentBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    mockEnablePostHog.mockClear();
    mockIdentify.mockClear();
  });

  test('accepts analytics consent and enables PostHog', async () => {
    await renderWithProviders(<AnalyticsConsentBanner />, {withAuth: true});

    expect(
      screen.getByRole('dialog', {name: /cookie and analytics consent/i}),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByText('Accept'));
    expect(mockEnablePostHog).toHaveBeenCalled();
    expect(localStorage.getItem('eciperay.analyticsConsent')).toBe('accepted');
    expect(
      screen.queryByRole('dialog', {name: /cookie and analytics consent/i}),
    ).not.toBeInTheDocument();
  });

  test('declines analytics consent without enabling PostHog', async () => {
    await renderWithProviders(<AnalyticsConsentBanner />, {withAuth: false});
    await userEvent.click(screen.getByText('Decline'));
    expect(mockEnablePostHog).not.toHaveBeenCalled();
    expect(localStorage.getItem('eciperay.analyticsConsent')).toBe('declined');
  });

  test('stays hidden when consent was already stored', async () => {
    localStorage.setItem('eciperay.analyticsConsent', 'accepted');
    await renderWithProviders(<AnalyticsConsentBanner />, {withAuth: false});
    expect(
      screen.queryByRole('dialog', {name: /cookie and analytics consent/i}),
    ).not.toBeInTheDocument();
  });
});

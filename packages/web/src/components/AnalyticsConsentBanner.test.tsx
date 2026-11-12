import {clearAnalyticsConsent} from '@eciperay/client';
import {act, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {renderWithProviders} from '../test/testUtils.js';

import {AnalyticsConsentBanner} from './AnalyticsConsentBanner.js';

const {mockEnablePostHog, mockDisablePostHog, mockIdentify} = vi.hoisted(
  () => ({
    mockEnablePostHog: vi.fn(),
    mockDisablePostHog: vi.fn(),
    mockIdentify: vi.fn(),
  }),
);

vi.mock('../lib/analytics.js', () => ({
  analytics: {identifyUser: mockIdentify},
  enablePostHog: () => mockEnablePostHog(),
  disablePostHog: () => mockDisablePostHog(),
}));

// #460 tranche 1: the former AnalyticsConsentBanner.noPosthog.test.tsx
// is merged below. The two files differed only in the mocked
// POSTHOG_KEY, so the env mock now reads it through a getter over a
// hoisted mutable value that each describe sets in beforeEach.
const posthogKeyState = vi.hoisted(() => ({value: 'phc_test'}));

vi.mock('../lib/env.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../lib/env.js')>();
  return {
    ...actual,
    get POSTHOG_KEY() {
      return posthogKeyState.value;
    },
    POSTHOG_HOST: 'https://us.i.posthog.com',
  };
});

describe('AnalyticsConsentBanner', () => {
  beforeEach(() => {
    posthogKeyState.value = 'phc_test';
    localStorage.clear();
    mockEnablePostHog.mockClear();
    mockDisablePostHog.mockClear();
    mockIdentify.mockClear();
  });

  test('accepts analytics consent and enables PostHog', async () => {
    await renderWithProviders(<AnalyticsConsentBanner />, {withAuth: true});

    const dialog = screen.getByRole('dialog', {
      name: /cookie and analytics consent/i,
    });
    expect(dialog).toBeInTheDocument();
    // The host wrapper pins the banner to the viewport's bottom edge
    // (the DS bar positions absolute; design-system#405)...
    expect(dialog.style.position).toBe('fixed');
    expect(dialog.style.bottom).toBe('0px');
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
    expect(mockDisablePostHog).toHaveBeenCalled();
    expect(localStorage.getItem('eciperay.analyticsConsent')).toBe('declined');
  });

  test('re-presents after consent is withdrawn on another surface', async () => {
    localStorage.setItem('eciperay.analyticsConsent', 'accepted');
    await renderWithProviders(<AnalyticsConsentBanner />, {withAuth: false});
    expect(
      screen.queryByRole('dialog', {name: /cookie and analytics consent/i}),
    ).not.toBeInTheDocument();
    act(() => {
      clearAnalyticsConsent();
    });
    expect(
      await screen.findByRole('dialog', {
        name: /cookie and analytics consent/i,
      }),
    ).toBeInTheDocument();
  });

  test('stays hidden when consent was already stored', async () => {
    localStorage.setItem('eciperay.analyticsConsent', 'accepted');
    await renderWithProviders(<AnalyticsConsentBanner />, {withAuth: false});
    expect(
      screen.queryByRole('dialog', {name: /cookie and analytics consent/i}),
    ).not.toBeInTheDocument();
  });
});

// Former AnalyticsConsentBanner.noPosthog.test.tsx.
describe('AnalyticsConsentBanner without PostHog', () => {
  beforeEach(() => {
    posthogKeyState.value = '';
    localStorage.clear();
  });

  afterEach(() => {
    posthogKeyState.value = 'phc_test';
  });

  test('does not render when analytics is not configured', async () => {
    await renderWithProviders(<AnalyticsConsentBanner />, {withAuth: false});
    expect(
      screen.queryByRole('dialog', {name: /cookie and analytics consent/i}),
    ).not.toBeInTheDocument();
  });
});

import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {FeedbackPreferenceProvider} from '@eciperay/client';

import {renderWithProviders} from '../test/testUtils.js';

import {ConsentPreferencesPage} from './ConsentPreferencesPage.js';

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

describe('ConsentPreferencesPage', () => {
  beforeEach(() => {
    localStorage.clear();
    mockEnablePostHog.mockClear();
    mockDisablePostHog.mockClear();
    mockIdentify.mockClear();
  });

  test('shows the undecided state on a fresh browser', async () => {
    await renderWithProviders(<ConsentPreferencesPage />, {withAuth: false});
    expect(
      screen.getByText(/Your current choice: Not set/),
    ).toBeInTheDocument();
  });

  test('accept stores the choice and enables PostHog immediately', async () => {
    await renderWithProviders(<ConsentPreferencesPage />, {withAuth: false});
    await userEvent.click(
      screen.getByRole('button', {name: 'Accept analytics consent'}),
    );
    expect(localStorage.getItem('eciperay.analyticsConsent')).toBe('accepted');
    expect(mockEnablePostHog).toHaveBeenCalled();
    expect(
      screen.getByText(/Your current choice: Accepted/),
    ).toBeInTheDocument();
  });

  test('decline stores the choice and disables PostHog immediately', async () => {
    localStorage.setItem('eciperay.analyticsConsent', 'accepted');
    await renderWithProviders(<ConsentPreferencesPage />, {withAuth: false});
    await userEvent.click(
      screen.getByRole('button', {name: 'Decline analytics consent'}),
    );
    expect(localStorage.getItem('eciperay.analyticsConsent')).toBe('declined');
    expect(mockDisablePostHog).toHaveBeenCalled();
    expect(
      screen.getByText(/Your current choice: Declined/),
    ).toBeInTheDocument();
  });

  test('declining forces the feedback shortcut preference off (#256)', async () => {
    localStorage.setItem('eciperay.feedbackShortcutEnabled', 'true');
    await renderWithProviders(
      <FeedbackPreferenceProvider initialEnabled>
        <ConsentPreferencesPage />
      </FeedbackPreferenceProvider>,
      {withAuth: false},
    );
    await userEvent.click(
      screen.getByRole('button', {name: 'Decline analytics consent'}),
    );
    expect(localStorage.getItem('eciperay.feedbackShortcutEnabled')).toBeNull();
  });

  test('withdrawing forces the feedback shortcut preference off (#256)', async () => {
    localStorage.setItem('eciperay.analyticsConsent', 'accepted');
    localStorage.setItem('eciperay.feedbackShortcutEnabled', 'true');
    await renderWithProviders(
      <FeedbackPreferenceProvider initialEnabled>
        <ConsentPreferencesPage />
      </FeedbackPreferenceProvider>,
      {withAuth: false},
    );
    await userEvent.click(
      screen.getByRole('button', {name: 'Withdraw consent'}),
    );
    expect(localStorage.getItem('eciperay.feedbackShortcutEnabled')).toBeNull();
  });

  test('withdraw clears the stored choice and disables PostHog', async () => {
    localStorage.setItem('eciperay.analyticsConsent', 'accepted');
    await renderWithProviders(<ConsentPreferencesPage />, {withAuth: false});
    await userEvent.click(
      screen.getByRole('button', {name: 'Withdraw consent'}),
    );
    expect(localStorage.getItem('eciperay.analyticsConsent')).toBeNull();
    expect(mockDisablePostHog).toHaveBeenCalled();
    expect(
      screen.getByText(/Your current choice: Not set/),
    ).toBeInTheDocument();
  });
});

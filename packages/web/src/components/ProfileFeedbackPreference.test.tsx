import {
  FeedbackPreferenceProvider,
  readAnalyticsConsent,
} from '@eciperay/client';
import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, test, vi} from 'vitest';

import {renderWithProviders} from '../test/testUtils.js';

import {ProfileFeedbackPreference} from './ProfileFeedbackPreference.js';

const mockEnv = vi.hoisted(() => ({POSTHOG_KEY: 'phc_test'}));

vi.mock('../lib/env.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../lib/env.js')>();
  return {
    ...actual,
    get POSTHOG_KEY() {
      return mockEnv.POSTHOG_KEY;
    },
  };
});

vi.mock('@eciperay/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@eciperay/client')>();
  return {...actual, readAnalyticsConsent: vi.fn(actual.readAnalyticsConsent)};
});

describe('ProfileFeedbackPreference', () => {
  beforeEach(() => {
    mockEnv.POSTHOG_KEY = 'phc_test';
    vi.mocked(readAnalyticsConsent).mockReturnValue('accepted');
  });

  test('toggles the feedback shortcut preference', async () => {
    const user = userEvent.setup();
    await renderWithProviders(
      <FeedbackPreferenceProvider initialEnabled={false}>
        <ProfileFeedbackPreference />
      </FeedbackPreferenceProvider>,
    );

    await user.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  test('explains when analytics cookies have not been accepted', async () => {
    vi.mocked(readAnalyticsConsent).mockReturnValue('declined');
    await renderWithProviders(
      <FeedbackPreferenceProvider initialEnabled={false}>
        <ProfileFeedbackPreference />
      </FeedbackPreferenceProvider>,
    );

    expect(
      screen.getByText(/accept analytics cookies before the shortcut/i),
    ).toBeInTheDocument();
  });

  test('explains when analytics is unavailable', async () => {
    mockEnv.POSTHOG_KEY = '';
    await renderWithProviders(
      <FeedbackPreferenceProvider initialEnabled={false}>
        <ProfileFeedbackPreference />
      </FeedbackPreferenceProvider>,
    );

    expect(
      screen.getByText(/analytics is not configured in this environment/i),
    ).toBeInTheDocument();
  });
});

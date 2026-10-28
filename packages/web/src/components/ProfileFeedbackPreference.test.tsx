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

const renderPreference = async (initialEnabled = false) =>
  renderWithProviders(
    <FeedbackPreferenceProvider initialEnabled={initialEnabled}>
      <ProfileFeedbackPreference />
    </FeedbackPreferenceProvider>,
  );

describe('ProfileFeedbackPreference', () => {
  beforeEach(() => {
    mockEnv.POSTHOG_KEY = 'phc_test';
    vi.mocked(readAnalyticsConsent).mockReturnValue('accepted');
  });

  test('toggles the feedback shortcut preference', async () => {
    const user = userEvent.setup();
    await renderPreference();

    await user.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  test('shows the analytics consent state with a change action', async () => {
    await renderPreference();

    expect(screen.getByText(/analytics consent:/i)).toHaveTextContent(
      'Accepted',
    );
    expect(
      screen.getByRole('button', {name: 'Decline analytics consent'}),
    ).toBeInTheDocument();
  });

  test('lets a declined user accept analytics consent from Profile', async () => {
    const user = userEvent.setup();
    vi.mocked(readAnalyticsConsent).mockReturnValue('declined');
    await renderPreference();

    expect(screen.getByText(/analytics consent:/i)).toHaveTextContent(
      'Declined',
    );
    await user.click(
      screen.getByRole('button', {name: 'Accept analytics consent'}),
    );
    expect(screen.getByText(/analytics consent:/i)).toHaveTextContent(
      'Accepted',
    );
  });

  test('enabling the shortcut re-presents the consent prompt even when consent was already accepted', async () => {
    const user = userEvent.setup();
    await renderPreference();

    await user.click(screen.getByRole('checkbox'));

    expect(
      screen.getByRole('group', {name: /analytics consent for feedback/i}),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: 'Accept'}));
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(
      screen.queryByRole('group', {name: /analytics consent for feedback/i}),
    ).not.toBeInTheDocument();
  });

  test('declining the re-presented prompt forces the shortcut off and shows an error', async () => {
    const user = userEvent.setup();
    vi.mocked(readAnalyticsConsent).mockReturnValue('declined');
    await renderPreference();

    await user.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).toBeChecked();

    await user.click(screen.getByRole('button', {name: 'Decline'}));
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('alert')).toHaveTextContent(
      /feedback shortcut needs analytics consent/i,
    );
    expect(screen.getByText(/analytics consent:/i)).toHaveTextContent(
      'Declined',
    );
  });

  test('explains when analytics is unavailable', async () => {
    mockEnv.POSTHOG_KEY = '';
    await renderPreference();

    expect(
      screen.getByText(/analytics is not configured in this environment/i),
    ).toBeInTheDocument();
  });
});

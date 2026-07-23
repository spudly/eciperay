import {
  FEEDBACK_SHORTCUT_STORAGE_KEY,
  FeedbackPreferenceProvider,
  readFeedbackShortcutEnabled,
  writeFeedbackShortcutEnabled,
  readAnalyticsConsent,
  createAnalytics,
  createNoopAnalyticsAdapter,
  AnalyticsProvider,
} from '@eciperay/client';
import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, test, vi} from 'vitest';

import {renderWithProviders} from '../test/testUtils.js';

import {FeedbackBubble} from './FeedbackBubble.js';

const submitUserFeedback = vi.fn();

vi.mock('../lib/env.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../lib/env.js')>();
  return {
    ...actual,
    POSTHOG_KEY: 'phc_test',
    POSTHOG_HOST: 'https://us.i.posthog.com',
  };
});

vi.mock('@eciperay/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@eciperay/client')>();
  return {
    ...actual,
    readAnalyticsConsent: vi.fn(actual.readAnalyticsConsent),
    useAnalytics: () => ({
      ...actual.createAnalytics(actual.createNoopAnalyticsAdapter(), 'web'),
      submitUserFeedback,
    }),
  };
});

describe('FeedbackBubble', () => {
  beforeEach(() => {
    localStorage.clear();
    submitUserFeedback.mockReset();
    submitUserFeedback.mockResolvedValue({error: null});
    vi.mocked(readAnalyticsConsent).mockReturnValue('accepted');
  });

  test('is hidden by default', async () => {
    await renderWithProviders(<FeedbackBubble />);
    expect(
      screen.queryByRole('button', {name: 'Send feedback'}),
    ).not.toBeInTheDocument();
  });

  test('opens the feedback form when enabled and consent is accepted', async () => {
    writeFeedbackShortcutEnabled(true);
    const user = userEvent.setup();
    await renderWithProviders(
      <FeedbackPreferenceProvider initialEnabled>
        <FeedbackBubble />
      </FeedbackPreferenceProvider>,
    );

    await user.click(screen.getByRole('button', {name: 'Send feedback'}));
    expect(
      screen.getByRole('dialog', {name: 'Send feedback'}),
    ).toBeInTheDocument();
    expect(localStorage.getItem(FEEDBACK_SHORTCUT_STORAGE_KEY)).toBe('true');
    expect(readFeedbackShortcutEnabled()).toBe(true);
  });

  test('closes the dialog after submit or cancel', async () => {
    writeFeedbackShortcutEnabled(true);
    const user = userEvent.setup();
    const analytics = {
      ...createAnalytics(createNoopAnalyticsAdapter(), 'web'),
      submitUserFeedback,
    };

    await renderWithProviders(
      <FeedbackPreferenceProvider initialEnabled>
        <AnalyticsProvider analytics={analytics}>
          <FeedbackBubble />
        </AnalyticsProvider>
      </FeedbackPreferenceProvider>,
    );

    await user.click(screen.getByRole('button', {name: 'Send feedback'}));
    await user.type(
      screen.getByPlaceholderText(/Tell us what happened/i),
      'The floating button covers important controls.',
    );
    await user.click(screen.getByRole('button', {name: 'Submit feedback'}));
    await waitFor(
      () => {
        expect(
          screen.queryByRole('dialog', {name: 'Send feedback'}),
        ).not.toBeInTheDocument();
      },
      {timeout: 3000},
    );

    await user.click(screen.getByRole('button', {name: 'Send feedback'}));
    await user.click(screen.getByRole('button', {name: 'Cancel'}));
    expect(
      screen.queryByRole('dialog', {name: 'Send feedback'}),
    ).not.toBeInTheDocument();
  });
});

import {
  AnalyticsProvider,
  createAnalytics,
  createNoopAnalyticsAdapter,
} from '@eciperay/client';
import {fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, test, vi} from 'vitest';

import {FeedbackForm} from './FeedbackForm.js';

describe('FeedbackForm', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test('submits feedback with the bug flag', async () => {
    const submitUserFeedback = vi.fn().mockResolvedValue({error: null});
    const analytics = {
      ...createAnalytics(createNoopAnalyticsAdapter(), 'web'),
      submitUserFeedback,
    };

    render(
      <FeedbackForm
        route="/profile"
        onSubmitted={vi.fn()}
        onCancel={vi.fn()}
      />,
      {
        wrapper: ({children}) => (
          <AnalyticsProvider analytics={analytics}>
            {children}
          </AnalyticsProvider>
        ),
      },
    );

    fireEvent.change(screen.getByPlaceholderText(/Tell us what happened/i), {
      target: {value: 'The profile page feels confusing to me.'},
    });
    fireEvent.click(screen.getByLabelText('This is a bug'));
    fireEvent.click(screen.getByRole('button', {name: 'Submit feedback'}));

    expect(
      await screen.findByText(/Thanks — we got your feedback/i),
    ).toBeInTheDocument();
    expect(submitUserFeedback).toHaveBeenCalledWith({
      message: 'The profile page feels confusing to me.',
      is_bug: true,
      route: '/profile',
    });
  });

  test('calls onSubmitted after showing thanks', async () => {
    const submitUserFeedback = vi.fn().mockResolvedValue({error: null});
    const onSubmitted = vi.fn();
    const analytics = {
      ...createAnalytics(createNoopAnalyticsAdapter(), 'web'),
      submitUserFeedback,
    };

    render(
      <FeedbackForm
        route="/profile"
        onSubmitted={onSubmitted}
      />,
      {
        wrapper: ({children}) => (
          <AnalyticsProvider analytics={analytics}>
            {children}
          </AnalyticsProvider>
        ),
      },
    );

    fireEvent.change(screen.getByPlaceholderText(/Tell us what happened/i), {
      target: {value: 'The profile page feels confusing to me.'},
    });
    fireEvent.click(screen.getByRole('button', {name: 'Submit feedback'}));

    expect(
      await screen.findByText(/Thanks — we got your feedback/i),
    ).toBeInTheDocument();
    await new Promise(resolve => {
      window.setTimeout(resolve, 1600);
    });
    expect(onSubmitted).toHaveBeenCalled();
  }, 5000);

  test('shows submit errors and supports cancel', async () => {
    const submitUserFeedback = vi
      .fn()
      .mockResolvedValue({error: 'Could not submit feedback.'});
    const onCancel = vi.fn();
    const analytics = {
      ...createAnalytics(createNoopAnalyticsAdapter(), 'web'),
      submitUserFeedback,
    };

    render(
      <FeedbackForm
        onSubmitted={vi.fn()}
        onCancel={onCancel}
      />,
      {
        wrapper: ({children}) => (
          <AnalyticsProvider analytics={analytics}>
            {children}
          </AnalyticsProvider>
        ),
      },
    );

    fireEvent.change(screen.getByPlaceholderText(/Tell us what happened/i), {
      target: {value: 'Something went wrong when I tried to save.'},
    });
    fireEvent.click(screen.getByRole('button', {name: 'Submit feedback'}));
    expect(
      await screen.findByText('Could not submit feedback.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));
    expect(onCancel).toHaveBeenCalled();
  });
});

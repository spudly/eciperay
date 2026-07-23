import {
  AnalyticsProvider,
  createAnalytics,
  createNoopAnalyticsAdapter,
} from '@eciperay/client';
import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {FeedbackForm} from './FeedbackForm';

describe('FeedbackForm', () => {
  test('submits feedback with the bug flag', async () => {
    const submitUserFeedback = jest.fn().mockResolvedValue({error: null});
    const analytics = {
      ...createAnalytics(createNoopAnalyticsAdapter(), 'android'),
      submitUserFeedback,
    };

    render(
      <FeedbackForm
        route="RecipesList"
        onSubmitted={jest.fn()}
      />,
      {
        wrapper: ({children}) => (
          <AnalyticsProvider analytics={analytics}>
            {children}
          </AnalyticsProvider>
        ),
      },
    );

    fireEvent.changeText(
      screen.getByPlaceholderText(/Tell us what happened/i),
      'The recipe list never refreshes after import.',
    );
    fireEvent(screen.getByLabelText('This is a bug'), 'valueChange', true);
    fireEvent.press(screen.getByText('Submit feedback'));

    await screen.findByText(/Thanks — we got your feedback/i);
    expect(submitUserFeedback).toHaveBeenCalledWith({
      message: 'The recipe list never refreshes after import.',
      is_bug: true,
      route: 'RecipesList',
    });
  });

  test('submits feedback without a route or callback', async () => {
    const submitUserFeedback = jest.fn().mockResolvedValue({error: null});
    const analytics = {
      ...createAnalytics(createNoopAnalyticsAdapter(), 'android'),
      submitUserFeedback,
    };

    render(<FeedbackForm />, {
      wrapper: ({children}) => (
        <AnalyticsProvider analytics={analytics}>{children}</AnalyticsProvider>
      ),
    });

    fireEvent.changeText(
      screen.getByPlaceholderText(/Tell us what happened/i),
      'The recipe list never refreshes after import.',
    );
    fireEvent.press(screen.getByText('Submit feedback'));

    await screen.findByText(/Thanks — we got your feedback/i);
    expect(submitUserFeedback).toHaveBeenCalledWith({
      message: 'The recipe list never refreshes after import.',
      is_bug: false,
    });
  });

  test('shows a submitting state while feedback is sent', async () => {
    let resolveSubmit: ((value: {error: string | null}) => void) | undefined;
    const submitUserFeedback = jest.fn(
      () =>
        new Promise<{error: string | null}>(resolve => {
          resolveSubmit = resolve;
        }),
    );
    const analytics = {
      ...createAnalytics(createNoopAnalyticsAdapter(), 'android'),
      submitUserFeedback,
    };

    render(<FeedbackForm route="RecipesList" />, {
      wrapper: ({children}) => (
        <AnalyticsProvider analytics={analytics}>{children}</AnalyticsProvider>
      ),
    });

    fireEvent.changeText(
      screen.getByPlaceholderText(/Tell us what happened/i),
      'The recipe list never refreshes after import.',
    );
    fireEvent.press(screen.getByText('Submit feedback'));

    expect(screen.getByText('Submitting…')).toBeTruthy();
    resolveSubmit?.({error: null});
    await screen.findByText(/Thanks — we got your feedback/i);
  });

  test('shows submit errors from analytics', async () => {
    const submitUserFeedback = jest
      .fn()
      .mockResolvedValue({error: 'Could not submit feedback.'});
    const analytics = {
      ...createAnalytics(createNoopAnalyticsAdapter(), 'android'),
      submitUserFeedback,
    };

    render(<FeedbackForm route="RecipesList" />, {
      wrapper: ({children}) => (
        <AnalyticsProvider analytics={analytics}>{children}</AnalyticsProvider>
      ),
    });

    fireEvent.changeText(
      screen.getByPlaceholderText(/Tell us what happened/i),
      'The recipe list never refreshes after import.',
    );
    fireEvent.press(screen.getByText('Submit feedback'));

    expect(await screen.findByText('Could not submit feedback.')).toBeTruthy();
  });
});

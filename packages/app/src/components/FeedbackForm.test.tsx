import React from 'react';
import type {ComponentProps} from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react-native';
import {TamaguiProvider} from 'tamagui';
import {
  AnalyticsProvider,
  createAnalytics,
  createNoopAnalyticsAdapter,
} from '@eciperay/client';
import {tamaguiConfig} from '@spudly/ui';

import {FeedbackForm} from './FeedbackForm';

let focusEffectCallback: (() => void) | undefined;

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useFocusEffect: (callback: () => void) => {
      focusEffectCallback = callback;
      React.useEffect(() => {
        callback();
      }, [callback]);
    },
  };
});

describe('FeedbackForm', () => {
  beforeEach(() => {
    focusEffectCallback = undefined;
  });

  // TamaguiProvider is required: the design-system Checkbox/Button adapters
  // throw "Missing theme." without it.
  const renderWithProviders = (
    ui: React.ReactElement,
    analytics: ComponentProps<typeof AnalyticsProvider>['analytics'],
  ) =>
    render(ui, {
      wrapper: ({children}) => (
        <TamaguiProvider
          config={tamaguiConfig}
          defaultTheme="light"
        >
          <AnalyticsProvider analytics={analytics}>
            {children}
          </AnalyticsProvider>
        </TamaguiProvider>
      ),
    });

  test('submits feedback with the bug flag', async () => {
    const submitUserFeedback = jest.fn().mockResolvedValue({error: null});
    const analytics = {
      ...createAnalytics(createNoopAnalyticsAdapter(), 'android'),
      submitUserFeedback,
    };

    renderWithProviders(
      <FeedbackForm
        route="RecipesList"
        onSubmitted={jest.fn()}
      />,
      analytics,
    );

    fireEvent.changeText(
      screen.getByPlaceholderText(/Tell us what happened/i),
      'The recipe list never refreshes after import.',
    );
    fireEvent.press(screen.getByText('This is a bug'));
    fireEvent.press(screen.getByRole('button', {name: 'Submit feedback'}));

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

    renderWithProviders(<FeedbackForm />, analytics);

    fireEvent.changeText(
      screen.getByPlaceholderText(/Tell us what happened/i),
      'The recipe list never refreshes after import.',
    );
    fireEvent.press(screen.getByRole('button', {name: 'Submit feedback'}));

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

    renderWithProviders(<FeedbackForm route="RecipesList" />, analytics);

    fireEvent.changeText(
      screen.getByPlaceholderText(/Tell us what happened/i),
      'The recipe list never refreshes after import.',
    );
    fireEvent.press(screen.getByRole('button', {name: 'Submit feedback'}));

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

    renderWithProviders(<FeedbackForm route="RecipesList" />, analytics);

    fireEvent.changeText(
      screen.getByPlaceholderText(/Tell us what happened/i),
      'The recipe list never refreshes after import.',
    );
    fireEvent.press(screen.getByRole('button', {name: 'Submit feedback'}));

    expect(await screen.findByText('Could not submit feedback.')).toBeTruthy();
  });

  test('resets the form when the feedback screen is focused again', async () => {
    const submitUserFeedback = jest.fn().mockResolvedValue({error: null});
    const analytics = {
      ...createAnalytics(createNoopAnalyticsAdapter(), 'android'),
      submitUserFeedback,
    };

    renderWithProviders(<FeedbackForm route="Feedback" />, analytics);

    fireEvent.changeText(
      screen.getByPlaceholderText(/Tell us what happened/i),
      'First feedback submission.',
    );
    fireEvent.press(screen.getByRole('button', {name: 'Submit feedback'}));
    await screen.findByText(/Thanks — we got your feedback/i);

    await act(async () => {
      focusEffectCallback?.();
    });

    expect(screen.getByPlaceholderText(/Tell us what happened/i)).toBeTruthy();
    expect(screen.queryByText(/Thanks — we got your feedback/i)).toBeNull();
  });
});

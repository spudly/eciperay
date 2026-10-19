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

import {APP_VERSION} from '../lib/env';

import {FeedbackForm} from './FeedbackForm';

let focusEffectCallback: (() => void) | undefined;

const mockUseAuth = jest.fn();

jest.mock('@eciperay/client', () => {
  const actual = jest.requireActual('@eciperay/client');
  return {...actual, useAuth: () => mockUseAuth()};
});

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
    mockUseAuth.mockReturnValue({session: null, isLoading: false});
  });

  // TamaguiProvider is required: the design-system Checkbox/Button adapters
  // throw "Missing theme." without it.
  const renderWithProviders = async (
    ui: React.ReactElement,
    analytics: ComponentProps<typeof AnalyticsProvider>['analytics'],
  ) =>
    await render(ui, {
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

    await renderWithProviders(
      <FeedbackForm
        route="RecipesList"
        onSubmitted={jest.fn()}
      />,
      analytics,
    );

    await fireEvent.changeText(
      screen.getByPlaceholderText(/Tell us what happened/i),
      'The recipe list never refreshes after import.',
    );
    await fireEvent.press(screen.getByText('This is a bug'));
    await fireEvent.press(
      screen.getByRole('button', {name: 'Submit feedback'}),
    );

    await screen.findByText(/Thanks — we got your feedback/i);
    expect(submitUserFeedback).toHaveBeenCalledWith({
      message: 'The recipe list never refreshes after import.',
      is_bug: true,
      route: 'RecipesList',
      app_version: APP_VERSION,
    });
  });

  test('pre-fills the reply email and attaches the user id when signed in', async () => {
    mockUseAuth.mockReturnValue({
      session: {user: {id: 'user-123', email: 'cook@example.com'}},
      isLoading: false,
    });
    const submitUserFeedback = jest.fn().mockResolvedValue({error: null});
    const analytics = {
      ...createAnalytics(createNoopAnalyticsAdapter(), 'android'),
      submitUserFeedback,
    };

    await renderWithProviders(<FeedbackForm route="RecipesList" />, analytics);

    const emailInput = screen.getByPlaceholderText('you@example.com');
    expect(emailInput.props.value).toBe('cook@example.com');

    await fireEvent.changeText(
      screen.getByPlaceholderText(/Tell us what happened/i),
      'The recipe list never refreshes after import.',
    );
    await fireEvent.press(
      screen.getByRole('button', {name: 'Submit feedback'}),
    );

    await screen.findByText(/Thanks — we got your feedback/i);
    expect(submitUserFeedback).toHaveBeenCalledWith({
      message: 'The recipe list never refreshes after import.',
      is_bug: false,
      route: 'RecipesList',
      reply_email: 'cook@example.com',
      user_id: 'user-123',
      app_version: APP_VERSION,
    });
  });

  test('sends a reply email typed by an anonymous user', async () => {
    const submitUserFeedback = jest.fn().mockResolvedValue({error: null});
    const analytics = {
      ...createAnalytics(createNoopAnalyticsAdapter(), 'android'),
      submitUserFeedback,
    };

    await renderWithProviders(<FeedbackForm route="RecipesList" />, analytics);

    await fireEvent.changeText(
      screen.getByPlaceholderText(/Tell us what happened/i),
      'The recipe list never refreshes after import.',
    );
    await fireEvent.changeText(
      screen.getByPlaceholderText('you@example.com'),
      'guest@example.com',
    );
    await fireEvent.press(
      screen.getByRole('button', {name: 'Submit feedback'}),
    );

    await screen.findByText(/Thanks — we got your feedback/i);
    expect(submitUserFeedback).toHaveBeenCalledWith({
      message: 'The recipe list never refreshes after import.',
      is_bug: false,
      route: 'RecipesList',
      reply_email: 'guest@example.com',
      app_version: APP_VERSION,
    });
  });

  test('blocks submission while the reply email is malformed', async () => {
    const submitUserFeedback = jest.fn().mockResolvedValue({error: null});
    const analytics = {
      ...createAnalytics(createNoopAnalyticsAdapter(), 'android'),
      submitUserFeedback,
    };

    await renderWithProviders(<FeedbackForm route="RecipesList" />, analytics);

    await fireEvent.changeText(
      screen.getByPlaceholderText(/Tell us what happened/i),
      'The recipe list never refreshes after import.',
    );
    await fireEvent.changeText(
      screen.getByPlaceholderText('you@example.com'),
      'not-an-email',
    );

    // Disabled buttons drop out of role queries, so traverse up from the
    // label to the element carrying accessibilityState (ImportTextScreen
    // pattern).
    let submitButton: ReturnType<typeof screen.getByText> | null =
      screen.getByText('Submit feedback');
    while (submitButton && !submitButton.props.accessibilityState) {
      submitButton = submitButton.parent;
    }
    expect(submitButton?.props.accessibilityState?.disabled).toBe(true);
    expect(submitUserFeedback).not.toHaveBeenCalled();
  });

  test('submits feedback without a route or callback', async () => {
    const submitUserFeedback = jest.fn().mockResolvedValue({error: null});
    const analytics = {
      ...createAnalytics(createNoopAnalyticsAdapter(), 'android'),
      submitUserFeedback,
    };

    await renderWithProviders(<FeedbackForm />, analytics);

    await fireEvent.changeText(
      screen.getByPlaceholderText(/Tell us what happened/i),
      'The recipe list never refreshes after import.',
    );
    await fireEvent.press(
      screen.getByRole('button', {name: 'Submit feedback'}),
    );

    await screen.findByText(/Thanks — we got your feedback/i);
    expect(submitUserFeedback).toHaveBeenCalledWith({
      message: 'The recipe list never refreshes after import.',
      is_bug: false,
      app_version: APP_VERSION,
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

    await renderWithProviders(<FeedbackForm route="RecipesList" />, analytics);

    await fireEvent.changeText(
      screen.getByPlaceholderText(/Tell us what happened/i),
      'The recipe list never refreshes after import.',
    );
    await fireEvent.press(
      screen.getByRole('button', {name: 'Submit feedback'}),
    );

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

    await renderWithProviders(<FeedbackForm route="RecipesList" />, analytics);

    await fireEvent.changeText(
      screen.getByPlaceholderText(/Tell us what happened/i),
      'The recipe list never refreshes after import.',
    );
    await fireEvent.press(
      screen.getByRole('button', {name: 'Submit feedback'}),
    );

    expect(await screen.findByText('Could not submit feedback.')).toBeTruthy();
  });

  test('resets the form when the feedback screen is focused again', async () => {
    const submitUserFeedback = jest.fn().mockResolvedValue({error: null});
    const analytics = {
      ...createAnalytics(createNoopAnalyticsAdapter(), 'android'),
      submitUserFeedback,
    };

    await renderWithProviders(<FeedbackForm route="Feedback" />, analytics);

    await fireEvent.changeText(
      screen.getByPlaceholderText(/Tell us what happened/i),
      'First feedback submission.',
    );
    await fireEvent.press(
      screen.getByRole('button', {name: 'Submit feedback'}),
    );
    await screen.findByText(/Thanks — we got your feedback/i);

    await act(async () => {
      focusEffectCallback?.();
    });

    expect(screen.getByPlaceholderText(/Tell us what happened/i)).toBeTruthy();
    expect(screen.queryByText(/Thanks — we got your feedback/i)).toBeNull();
  });
});

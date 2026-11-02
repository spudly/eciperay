import {
  AnalyticsProvider,
  createAnalytics,
  createNoopAnalyticsAdapter,
} from '@eciperay/client';
import {fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import {APP_VERSION} from '../lib/env.js';

import {FeedbackForm} from './FeedbackForm.js';

const mockUseAuth = vi.fn();

vi.mock('@eciperay/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@eciperay/client')>();
  return {...actual, useAuth: () => mockUseAuth()};
});

type Analytics = ReturnType<typeof createAnalytics>;

const renderForm = (
  submitUserFeedback: Analytics['submitUserFeedback'],
  props: {onSubmitted?: () => void; onCancel?: () => void} = {},
) => {
  const analytics = {
    ...createAnalytics(createNoopAnalyticsAdapter(), 'web'),
    submitUserFeedback,
  };
  return render(
    <FeedbackForm
      route="/profile"
      onSubmitted={props.onSubmitted ?? vi.fn()}
      onCancel={props.onCancel}
    />,
    {
      wrapper: ({children}) => (
        <AnalyticsProvider analytics={analytics}>{children}</AnalyticsProvider>
      ),
    },
  );
};

describe('FeedbackForm', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({session: null, isLoading: false});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('submits feedback with the bug flag', async () => {
    const submitUserFeedback = vi.fn().mockResolvedValue({error: null});
    renderForm(submitUserFeedback, {onCancel: vi.fn()});

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
      ...(APP_VERSION ? {app_version: APP_VERSION} : {}),
    });
  });

  test('pre-fills the reply email and attaches the user id when signed in', async () => {
    mockUseAuth.mockReturnValue({
      session: {user: {id: 'user-123', email: 'cook@example.com'}},
      isLoading: false,
    });
    const submitUserFeedback = vi.fn().mockResolvedValue({error: null});
    renderForm(submitUserFeedback);

    const emailInput = screen.getByPlaceholderText('you@example.com');
    expect(emailInput).toHaveValue('cook@example.com');

    fireEvent.change(screen.getByPlaceholderText(/Tell us what happened/i), {
      target: {value: 'The profile page feels confusing to me.'},
    });
    fireEvent.click(screen.getByRole('button', {name: 'Submit feedback'}));

    expect(
      await screen.findByText(/Thanks — we got your feedback/i),
    ).toBeInTheDocument();
    expect(submitUserFeedback).toHaveBeenCalledWith({
      message: 'The profile page feels confusing to me.',
      is_bug: false,
      route: '/profile',
      reply_email: 'cook@example.com',
      user_id: 'user-123',
      ...(APP_VERSION ? {app_version: APP_VERSION} : {}),
    });
  });

  test('updates an untouched prefill when the account changes', () => {
    mockUseAuth.mockReturnValue({
      session: {user: {id: 'user-a', email: 'first@example.com'}},
      isLoading: false,
    });
    const submitUserFeedback = vi.fn().mockResolvedValue({error: null});
    const view = renderForm(submitUserFeedback);
    const emailInput = screen.getByPlaceholderText('you@example.com');
    expect(emailInput).toHaveValue('first@example.com');

    mockUseAuth.mockReturnValue({
      session: {user: {id: 'user-b', email: 'second@example.com'}},
      isLoading: false,
    });
    view.rerender(
      <FeedbackForm
        route="/profile"
        onSubmitted={vi.fn()}
      />,
    );

    expect(emailInput).toHaveValue('second@example.com');
  });

  test('clears an untouched prefill on sign-out', () => {
    mockUseAuth.mockReturnValue({
      session: {user: {id: 'user-a', email: 'first@example.com'}},
      isLoading: false,
    });
    const submitUserFeedback = vi.fn().mockResolvedValue({error: null});
    const view = renderForm(submitUserFeedback);
    const emailInput = screen.getByPlaceholderText('you@example.com');
    expect(emailInput).toHaveValue('first@example.com');

    mockUseAuth.mockReturnValue({session: null, isLoading: false});
    view.rerender(
      <FeedbackForm
        route="/profile"
        onSubmitted={vi.fn()}
      />,
    );

    expect(emailInput).toHaveValue('');
  });

  test('preserves a deliberate reply email edit across account changes', () => {
    mockUseAuth.mockReturnValue({
      session: {user: {id: 'user-a', email: 'first@example.com'}},
      isLoading: false,
    });
    const submitUserFeedback = vi.fn().mockResolvedValue({error: null});
    const view = renderForm(submitUserFeedback);
    const emailInput = screen.getByPlaceholderText('you@example.com');
    fireEvent.change(emailInput, {target: {value: 'mine@example.com'}});

    mockUseAuth.mockReturnValue({
      session: {user: {id: 'user-b', email: 'second@example.com'}},
      isLoading: false,
    });
    view.rerender(
      <FeedbackForm
        route="/profile"
        onSubmitted={vi.fn()}
      />,
    );

    expect(emailInput).toHaveValue('mine@example.com');
  });

  test('preserves a deliberately cleared reply email across sign-in', () => {
    mockUseAuth.mockReturnValue({
      session: {user: {id: 'user-a', email: 'first@example.com'}},
      isLoading: false,
    });
    const submitUserFeedback = vi.fn().mockResolvedValue({error: null});
    const view = renderForm(submitUserFeedback);
    const emailInput = screen.getByPlaceholderText('you@example.com');
    fireEvent.change(emailInput, {target: {value: ''}});

    mockUseAuth.mockReturnValue({
      session: {user: {id: 'user-b', email: 'second@example.com'}},
      isLoading: false,
    });
    view.rerender(
      <FeedbackForm
        route="/profile"
        onSubmitted={vi.fn()}
      />,
    );

    expect(emailInput).toHaveValue('');
  });

  test('sends a reply email typed by an anonymous user', async () => {
    const submitUserFeedback = vi.fn().mockResolvedValue({error: null});
    renderForm(submitUserFeedback);

    fireEvent.change(screen.getByPlaceholderText(/Tell us what happened/i), {
      target: {value: 'The profile page feels confusing to me.'},
    });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: {value: 'guest@example.com'},
    });
    fireEvent.click(screen.getByRole('button', {name: 'Submit feedback'}));

    expect(
      await screen.findByText(/Thanks — we got your feedback/i),
    ).toBeInTheDocument();
    expect(submitUserFeedback).toHaveBeenCalledWith({
      message: 'The profile page feels confusing to me.',
      is_bug: false,
      route: '/profile',
      reply_email: 'guest@example.com',
      ...(APP_VERSION ? {app_version: APP_VERSION} : {}),
    });
  });

  test('blocks submission while the reply email is malformed', async () => {
    const submitUserFeedback = vi.fn().mockResolvedValue({error: null});
    renderForm(submitUserFeedback);

    fireEvent.change(screen.getByPlaceholderText(/Tell us what happened/i), {
      target: {value: 'The profile page feels confusing to me.'},
    });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: {value: 'not-an-email'},
    });

    expect(
      screen.getByRole('button', {name: 'Submit feedback'}),
    ).toBeDisabled();
    expect(submitUserFeedback).not.toHaveBeenCalled();
  });

  test('calls onSubmitted after showing thanks', async () => {
    const submitUserFeedback = vi.fn().mockResolvedValue({error: null});
    const onSubmitted = vi.fn();
    renderForm(submitUserFeedback, {onSubmitted});

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
    renderForm(submitUserFeedback, {onCancel});

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

  test('lays out the page and Cancel in a column that reserves Cancel space (#330)', () => {
    const submitUserFeedback = vi.fn().mockResolvedValue({error: null});
    renderForm(submitUserFeedback, {onCancel: vi.fn()});

    // The DS page's ScrollView claims min-height: 100% of the bubble panel;
    // without the flex column, Cancel flowed below the panel's fold and was
    // clipped. The column root fills the panel, the page wrapper flexes and
    // may shrink, and Cancel stays in flow below it.
    const cancel = screen.getByRole('button', {name: 'Cancel'});
    const root = cancel.closest('div.flex.flex-col');
    expect(root).not.toBeNull();
    expect(root?.className).toContain('h-full');
    const pageWrapper = root?.firstElementChild;
    expect(pageWrapper?.className).toContain('flex-1');
    expect(pageWrapper?.className).toContain('min-h-0');
    expect(pageWrapper?.className).toContain('flex-col');
  });
});

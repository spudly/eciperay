import {
  createAnalytics,
  createNoopAnalyticsAdapter,
} from './createAnalytics.js';
import {submitUserFeedback} from './submitUserFeedback.js';

describe('submitUserFeedback', () => {
  test('validates message length', async () => {
    const capture = jest.fn();
    const result = await submitUserFeedback(
      {...createNoopAnalyticsAdapter(), capture},
      'web',
      {message: 'short', is_bug: false},
    );
    expect(result.error).toMatch(/at least 10 characters/i);
    expect(capture).not.toHaveBeenCalled();
  });

  test('rejects messages that exceed the max length', async () => {
    const capture = jest.fn();
    const result = await submitUserFeedback(
      {...createNoopAnalyticsAdapter(), capture},
      'web',
      {message: 'x'.repeat(2001), is_bug: false},
    );
    expect(result.error).toMatch(/under 2000 characters/i);
    expect(capture).not.toHaveBeenCalled();
  });

  test('accepts messages up to the raised max length', async () => {
    const capture = jest.fn();
    const message = 'x'.repeat(501);
    const result = await submitUserFeedback(
      {...createNoopAnalyticsAdapter(), capture},
      'web',
      {message, is_bug: false},
    );
    expect(result.error).toBeNull();
    expect(capture).toHaveBeenCalledWith(
      'user_feedback',
      expect.objectContaining({message}),
    );
  });

  test('captures reply email, user id, and app version when provided', async () => {
    const capture = jest.fn();
    const result = await submitUserFeedback(
      {...createNoopAnalyticsAdapter(), capture},
      'web',
      {
        message: 'The import screen never finishes loading.',
        is_bug: true,
        reply_email: '  cook@example.com ',
        user_id: 'user-123',
        app_version: '1.22.2',
      },
    );
    expect(result.error).toBeNull();
    expect(capture).toHaveBeenCalledWith('user_feedback', {
      message: 'The import screen never finishes loading.',
      is_bug: true,
      platform: 'web',
      reply_email: 'cook@example.com',
      user_id: 'user-123',
      app_version: '1.22.2',
    });
  });

  test('omits blank reply email, user id, and app version from the event', async () => {
    const capture = jest.fn();
    const result = await submitUserFeedback(
      {...createNoopAnalyticsAdapter(), capture},
      'web',
      {
        message: 'The import screen never finishes loading.',
        is_bug: true,
        reply_email: '   ',
        user_id: '',
        app_version: '',
      },
    );
    expect(result.error).toBeNull();
    expect(capture).toHaveBeenCalledWith('user_feedback', {
      message: 'The import screen never finishes loading.',
      is_bug: true,
      platform: 'web',
    });
  });

  test('rejects a malformed reply email', async () => {
    const capture = jest.fn();
    const result = await submitUserFeedback(
      {...createNoopAnalyticsAdapter(), capture},
      'web',
      {
        message: 'The import screen never finishes loading.',
        is_bug: true,
        reply_email: 'not-an-email',
      },
    );
    expect(result.error).toMatch(/valid email/i);
    expect(capture).not.toHaveBeenCalled();
  });

  test('forces session recording and captures feedback', async () => {
    const capture = jest.fn();
    const ensureSessionRecordingForFeedback = jest.fn();
    const getSessionId = jest.fn().mockReturnValue('session-1');
    const getSessionReplayUrl = jest
      .fn()
      .mockReturnValue('https://posthog.example/replay');

    const result = await submitUserFeedback(
      {
        ...createNoopAnalyticsAdapter(),
        capture,
        ensureSessionRecordingForFeedback,
        getSessionId,
        getSessionReplayUrl,
      },
      'ios',
      {
        message: 'The import screen never finishes loading.',
        is_bug: true,
        route: 'ImportUrl',
      },
    );

    expect(result.error).toBeNull();
    expect(ensureSessionRecordingForFeedback).toHaveBeenCalled();
    expect(capture).toHaveBeenCalledWith('user_feedback', {
      message: 'The import screen never finishes loading.',
      is_bug: true,
      route: 'ImportUrl',
      platform: 'ios',
      session_id: 'session-1',
      replay_url: 'https://posthog.example/replay',
    });
  });

  test('is exposed on the analytics client', async () => {
    const capture = jest.fn();
    const analytics = createAnalytics(
      {...createNoopAnalyticsAdapter(), capture},
      'web',
    );
    await analytics.submitUserFeedback({
      message: 'Would love bulk tag editing.',
      is_bug: false,
    });
    expect(capture).toHaveBeenCalledWith(
      'user_feedback',
      expect.objectContaining({
        message: 'Would love bulk tag editing.',
        is_bug: false,
        platform: 'web',
      }),
    );
  });
});

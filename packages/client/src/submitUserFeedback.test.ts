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
      {message: 'x'.repeat(501), is_bug: false},
    );
    expect(result.error).toMatch(/under 500 characters/i);
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

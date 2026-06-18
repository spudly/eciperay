import {beforeEach, describe, expect, test, vi} from 'vitest';

import {createWebAnalytics} from './createWebAnalytics.js';

const {
  posthogInit,
  posthogCapture,
  posthogIdentify,
  posthogReset,
  posthogIsFeatureEnabled,
  posthogGetFeatureFlagResult,
  posthogReloadFeatureFlags,
  posthogCaptureException,
  posthogLoggerInfo,
  posthogLoggerWarn,
  posthogLoggerError,
  posthogLoggerDebug,
  posthogLoggerTrace,
  posthogOnFeatureFlags,
} = vi.hoisted(() => ({
  posthogInit: vi.fn(),
  posthogCapture: vi.fn(),
  posthogIdentify: vi.fn(),
  posthogReset: vi.fn(),
  posthogIsFeatureEnabled: vi.fn(),
  posthogGetFeatureFlagResult: vi.fn(() => ({
    value: 'variant-a',
    payload: {color: 'blue'},
  })),
  posthogReloadFeatureFlags: vi.fn(),
  posthogCaptureException: vi.fn(),
  posthogLoggerInfo: vi.fn(),
  posthogLoggerWarn: vi.fn(),
  posthogLoggerError: vi.fn(),
  posthogLoggerDebug: vi.fn(),
  posthogLoggerTrace: vi.fn(),
  posthogOnFeatureFlags: vi.fn(() => vi.fn()),
}));

vi.mock('posthog-js', () => ({
  default: {
    init: posthogInit,
    capture: posthogCapture,
    identify: posthogIdentify,
    reset: posthogReset,
    isFeatureEnabled: posthogIsFeatureEnabled,
    getFeatureFlagResult: posthogGetFeatureFlagResult,
    onFeatureFlags: posthogOnFeatureFlags,
    reloadFeatureFlags: posthogReloadFeatureFlags,
    captureException: posthogCaptureException,
    logger: {
      info: posthogLoggerInfo,
      warn: posthogLoggerWarn,
      error: posthogLoggerError,
      debug: posthogLoggerDebug,
      trace: posthogLoggerTrace,
    },
  },
}));

describe('createWebAnalytics', () => {
  beforeEach(() => {
    posthogInit.mockClear();
    posthogCapture.mockClear();
    posthogIdentify.mockClear();
    posthogReset.mockClear();
    posthogIsFeatureEnabled.mockClear();
    posthogGetFeatureFlagResult.mockClear();
    posthogCaptureException.mockClear();
    posthogLoggerInfo.mockClear();
    posthogOnFeatureFlags.mockClear();
  });

  test('returns a noop client when PostHog key is unset', () => {
    const client = createWebAnalytics('', '');
    expect(client.platform).toBe('web');
    client.track('recipe_deleted', {recipe_id: 'recipe-1'});
    expect(posthogInit).not.toHaveBeenCalled();
    expect(posthogCapture).not.toHaveBeenCalled();
  });

  test('initializes PostHog with replay, flags, errors, and logs', () => {
    const client = createWebAnalytics('phc_test', 'https://us.i.posthog.com');
    client.track('recipe_deleted', {recipe_id: 'recipe-1'});
    expect(posthogInit).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        api_host: 'https://us.i.posthog.com',
        capture_pageview: true,
        disable_web_experiments: false,
        capture_exceptions: expect.objectContaining({
          capture_unhandled_errors: true,
        }),
        logs: expect.objectContaining({serviceName: 'eciperay-web'}),
        session_recording: expect.objectContaining({maskAllInputs: true}),
      }),
    );
    expect(posthogCapture).toHaveBeenCalledWith('recipe_deleted', {
      recipe_id: 'recipe-1',
      platform: 'web',
    });
    client.identifyUser('user-1', {email: 'chef@example.com'});
    expect(posthogIdentify).toHaveBeenCalledWith('user-1', {
      email: 'chef@example.com',
    });
    client.reset();
    expect(posthogReset).toHaveBeenCalled();
    client.isFeatureEnabled('flag-a');
    expect(posthogIsFeatureEnabled).toHaveBeenCalledWith('flag-a');
    client.getFeatureFlag('flag-a');
    expect(posthogGetFeatureFlagResult).toHaveBeenCalledWith('flag-a');
    client.getFeatureFlagPayload('flag-a');
    expect(posthogGetFeatureFlagResult).toHaveBeenCalledWith('flag-a');
    client.reloadFeatureFlags();
    expect(posthogReloadFeatureFlags).toHaveBeenCalled();
    client.captureException(new Error('boom'));
    expect(posthogCaptureException).toHaveBeenCalled();
    client.log('info', 'loaded');
    expect(posthogLoggerInfo).toHaveBeenCalledWith('loaded', undefined);
    client.log('warn', 'slow');
    expect(posthogLoggerWarn).toHaveBeenCalledWith('slow', undefined);
    client.log('error', 'failed');
    expect(posthogLoggerError).toHaveBeenCalledWith('failed', undefined);
    client.log('debug', 'debugging');
    expect(posthogLoggerDebug).toHaveBeenCalledWith('debugging', undefined);
    client.log('trace', 'tracing');
    expect(posthogLoggerTrace).toHaveBeenCalledWith('tracing', undefined);
    client.onFeatureFlags(() => {});
    expect(posthogOnFeatureFlags).toHaveBeenCalled();
  });

  test('uses the default PostHog host when host is empty', () => {
    const client = createWebAnalytics('phc_test', '');
    client.track('recipe_deleted', {recipe_id: 'recipe-1'});
    expect(posthogInit).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({api_host: 'https://us.i.posthog.com'}),
    );
  });
});

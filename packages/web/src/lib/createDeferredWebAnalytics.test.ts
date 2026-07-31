import {beforeEach, describe, expect, test, vi} from 'vitest';

import {createDeferredWebAnalytics} from './createDeferredWebAnalytics.js';

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
      error: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
    },
  },
}));

describe('createDeferredWebAnalytics', () => {
  beforeEach(() => {
    posthogInit.mockClear();
  });

  test('defers PostHog init until enabled', () => {
    const {analytics: deferred, enablePostHog} = createDeferredWebAnalytics(
      'phc_test',
      'https://us.i.posthog.com',
    );
    deferred.isFeatureEnabled('flag-a');
    deferred.getFeatureFlag('flag-a');
    deferred.getFeatureFlagPayload('flag-a');
    deferred.onFeatureFlags(() => {});
    deferred.reloadFeatureFlags();
    deferred.captureException(new Error('boom'));
    deferred.log('info', 'loaded');
    deferred.identifyUser('user-1', {email: 'chef@example.com'});
    deferred.reset();
    deferred.track('recipe_deleted', {recipe_id: 'recipe-1'});
    expect(posthogInit).not.toHaveBeenCalled();
    enablePostHog();
    deferred.track('recipe_deleted', {recipe_id: 'recipe-2'});
    deferred.reloadFeatureFlags();
    deferred.captureException(new Error('after'));
    deferred.log('warn', 'after');
    deferred.isFeatureEnabled('flag-b');
    deferred.getFeatureFlag('flag-b');
    deferred.getFeatureFlagPayload('flag-b');
    deferred.onFeatureFlags(() => {});
    expect(posthogInit).toHaveBeenCalled();
    enablePostHog();
    expect(posthogInit).toHaveBeenCalledTimes(1);
  });

  test('uses the default PostHog host when deferred analytics enables', () => {
    const {enablePostHog} = createDeferredWebAnalytics('phc_test', '');
    enablePostHog();
    expect(posthogInit).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        api_host: 'https://us.i.posthog.com',
        ui_host: 'https://us.posthog.com',
      }),
    );
  });

  test('noops deferred enable when PostHog key is unset', () => {
    const {analytics: deferred, enablePostHog} = createDeferredWebAnalytics(
      '',
      '',
    );
    enablePostHog();
    deferred.track('recipe_deleted', {recipe_id: 'recipe-1'});
    expect(posthogInit).not.toHaveBeenCalled();
  });
});

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
  posthogOptInCapturing,
  posthogOptOutCapturing,
  posthogStopSessionRecording,
  posthogStartSessionRecording,
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
  posthogOptInCapturing: vi.fn(),
  posthogOptOutCapturing: vi.fn(),
  posthogStopSessionRecording: vi.fn(),
  posthogStartSessionRecording: vi.fn(),
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
    opt_in_capturing: posthogOptInCapturing,
    opt_out_capturing: posthogOptOutCapturing,
    stopSessionRecording: posthogStopSessionRecording,
    startSessionRecording: posthogStartSessionRecording,
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
    posthogCapture.mockClear();
    posthogReset.mockClear();
    posthogOptInCapturing.mockClear();
    posthogOptOutCapturing.mockClear();
    posthogStopSessionRecording.mockClear();
    posthogStartSessionRecording.mockClear();
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

  test('disable stops forwarding, opts the SDK out, and re-enable restores it', () => {
    const {
      analytics: deferred,
      enablePostHog,
      disablePostHog,
    } = createDeferredWebAnalytics('phc_test', 'https://us.i.posthog.com');

    disablePostHog();
    expect(posthogOptOutCapturing).not.toHaveBeenCalled();

    enablePostHog();
    deferred.track('recipe_deleted', {recipe_id: 'recipe-1'});
    expect(posthogCapture).toHaveBeenCalledTimes(1);
    expect(posthogOptInCapturing).toHaveBeenCalledTimes(1);
    // First enable: recording was never stopped, so no explicit resume.
    expect(posthogStartSessionRecording).not.toHaveBeenCalled();

    disablePostHog();
    expect(posthogOptOutCapturing).toHaveBeenCalledTimes(2);
    expect(posthogStopSessionRecording).toHaveBeenCalledTimes(1);
    expect(posthogReset).toHaveBeenCalledTimes(1);
    // The opt-out brackets reset(): the first opt-out makes the capture()
    // gate drop the buffered session-replay snapshots reset() flushes
    // (flushBeforeIdentityReset), and because reset() clears stored SDK
    // state — including that opt-out — the second opt-out is the one that
    // survives.
    const [firstOptOutOrder, secondOptOutOrder] =
      posthogOptOutCapturing.mock.invocationCallOrder;
    expect(firstOptOutOrder).toBeLessThan(
      posthogReset.mock.invocationCallOrder[0] ?? Infinity,
    );
    expect(posthogReset.mock.invocationCallOrder[0]).toBeLessThan(
      secondOptOutOrder ?? Infinity,
    );
    posthogCapture.mockClear();
    deferred.track('recipe_deleted', {recipe_id: 'recipe-2'});
    expect(posthogCapture).not.toHaveBeenCalled();

    enablePostHog();
    deferred.track('recipe_deleted', {recipe_id: 'recipe-3'});
    expect(posthogCapture).toHaveBeenCalledTimes(1);
    expect(posthogOptInCapturing).toHaveBeenCalledTimes(2);
    // Re-enable after a disable explicitly resumes session recording.
    expect(posthogStartSessionRecording).toHaveBeenCalledTimes(1);
  });
});

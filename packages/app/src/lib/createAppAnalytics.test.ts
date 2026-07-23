import AsyncStorage from '@react-native-async-storage/async-storage';
import PostHog from 'posthog-react-native';

import {
  appAnalyticsPlatform,
  createAppAnalytics,
  resolveAppAnalyticsPlatform,
} from './createAppAnalytics';

const MockPostHog = PostHog as jest.MockedClass<typeof PostHog>;

describe('createAppAnalytics', () => {
  beforeEach(() => {
    MockPostHog.mockClear();
  });

  test('returns a noop client when PostHog key is unset', () => {
    const client = createAppAnalytics('', '', 'android');
    expect(client.platform).toBe('android');
    client.track('recipe_deleted', {recipe_id: 'recipe-1'});
    expect(MockPostHog).not.toHaveBeenCalled();
  });

  test('captures events when PostHog key is configured', async () => {
    const capture = jest.fn();
    const identify = jest.fn();
    const reset = jest.fn();
    const isFeatureEnabled = jest.fn();
    const getFeatureFlag = jest.fn();
    const getFeatureFlagPayload = jest.fn();
    const reloadFeatureFlags = jest.fn();
    const captureException = jest.fn();
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
    };
    const startSessionRecording = jest.fn().mockImplementation(async () => {});
    const getSessionId = jest.fn().mockReturnValue('session-app-1');
    MockPostHog.mockImplementation(
      () =>
        ({
          capture,
          identify,
          reset,
          isFeatureEnabled,
          getFeatureFlag,
          getFeatureFlagPayload,
          onFeatureFlags: jest.fn(() => jest.fn()),
          reloadFeatureFlags,
          captureException,
          logger,
          startSessionRecording,
          getSessionId,
        }) as unknown as PostHog,
    );
    const client = createAppAnalytics(
      'phc_test',
      'https://us.i.posthog.com',
      'ios',
    );
    expect(MockPostHog).toHaveBeenCalledWith('phc_test', {
      host: 'https://us.i.posthog.com',
      customStorage: AsyncStorage,
      enableSessionReplay: true,
      errorTracking: {
        autocapture: {
          uncaughtExceptions: true,
          unhandledRejections: true,
          nativeCrashes: true,
        },
      },
      logs: expect.objectContaining({
        serviceName: 'eciperay-app',
        resourceAttributes: {platform: 'ios'},
      }),
    });
    client.track('recipe_deleted', {recipe_id: 'recipe-1'});
    expect(capture).toHaveBeenCalledWith('recipe_deleted', {
      recipe_id: 'recipe-1',
      platform: 'ios',
    });
    client.identifyUser('user-1');
    expect(identify).toHaveBeenCalledWith('user-1', undefined);
    client.reset();
    expect(reset).toHaveBeenCalled();
    client.isFeatureEnabled('flag-a');
    expect(isFeatureEnabled).toHaveBeenCalledWith('flag-a');
    client.getFeatureFlag('flag-a');
    expect(getFeatureFlag).toHaveBeenCalledWith('flag-a');
    client.getFeatureFlagPayload('flag-a');
    expect(getFeatureFlagPayload).toHaveBeenCalledWith('flag-a');
    client.reloadFeatureFlags();
    expect(reloadFeatureFlags).toHaveBeenCalled();
    client.onFeatureFlags(() => {});
    client.captureException(new Error('boom'));
    expect(captureException).toHaveBeenCalled();
    client.log('info', 'ready');
    expect(logger.info).toHaveBeenCalledWith('ready', undefined);
    client.log('warn', 'slow');
    expect(logger.warn).toHaveBeenCalledWith('slow', undefined);
    client.log('error', 'failed');
    expect(logger.error).toHaveBeenCalledWith('failed', undefined);
    client.log('debug', 'debugging');
    expect(logger.debug).toHaveBeenCalledWith('debugging', undefined);
    client.log('trace', 'tracing');
    expect(logger.trace).toHaveBeenCalledWith('tracing', undefined);
    await client.submitUserFeedback({
      message: 'Import screen hangs on my phone.',
      is_bug: true,
      route: 'ImportUrl',
    });
    expect(startSessionRecording).toHaveBeenCalledWith(true);
    expect(capture).toHaveBeenCalledWith(
      'user_feedback',
      expect.objectContaining({
        message: 'Import screen hangs on my phone.',
        is_bug: true,
        route: 'ImportUrl',
        platform: 'ios',
        session_id: 'session-app-1',
      }),
    );
  });

  test('reads feature flag payloads from getFeatureFlagResult when available', () => {
    const getFeatureFlagResult = jest.fn(() => ({payload: {color: 'blue'}}));
    MockPostHog.mockImplementation(
      () =>
        ({
          capture: jest.fn(),
          identify: jest.fn(),
          reset: jest.fn(),
          getFeatureFlagResult,
          onFeatureFlags: jest.fn(() => jest.fn()),
          logger: {info: jest.fn()},
        }) as unknown as PostHog,
    );
    const client = createAppAnalytics(
      'phc_test',
      'https://us.i.posthog.com',
      'android',
    );
    expect(client.getFeatureFlagPayload('flag-a')).toEqual({color: 'blue'});
    expect(getFeatureFlagResult).toHaveBeenCalledWith('flag-a');
  });

  test('uses the default PostHog host when host is empty', () => {
    const capture = jest.fn();
    MockPostHog.mockImplementation(
      () =>
        ({
          capture,
          identify: jest.fn(),
          reset: jest.fn(),
          onFeatureFlags: jest.fn(() => jest.fn()),
          logger: {info: jest.fn()},
        }) as unknown as PostHog,
    );
    const client = createAppAnalytics('phc_test', '', 'android');
    client.track('recipe_deleted', {recipe_id: 'recipe-1'});
    expect(MockPostHog).toHaveBeenCalledWith('phc_test', {
      host: 'https://us.i.posthog.com',
      customStorage: AsyncStorage,
      enableSessionReplay: true,
      errorTracking: {
        autocapture: {
          uncaughtExceptions: true,
          unhandledRejections: true,
          nativeCrashes: true,
        },
      },
      logs: expect.objectContaining({serviceName: 'eciperay-app'}),
    });
  });

  test('uses production log environment when not in dev', () => {
    const previousDev = (globalThis as {__DEV__?: boolean}).__DEV__;
    (globalThis as {__DEV__?: boolean}).__DEV__ = false;
    MockPostHog.mockImplementation(
      () =>
        ({
          capture: jest.fn(),
          identify: jest.fn(),
          reset: jest.fn(),
          onFeatureFlags: jest.fn(() => jest.fn()),
          logger: {info: jest.fn()},
        }) as unknown as PostHog,
    );
    createAppAnalytics('phc_test', 'https://us.i.posthog.com', 'android');
    expect(MockPostHog).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        customStorage: AsyncStorage,
        logs: expect.objectContaining({environment: 'production'}),
      }),
    );
    (globalThis as {__DEV__?: boolean}).__DEV__ = previousDev;
  });

  test('maps the React Native platform to analytics platform', () => {
    expect(['ios', 'android']).toContain(appAnalyticsPlatform);
    expect(resolveAppAnalyticsPlatform('ios')).toBe('ios');
    expect(resolveAppAnalyticsPlatform('android')).toBe('android');
  });
});

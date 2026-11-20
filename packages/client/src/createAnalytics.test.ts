import {
  createAnalytics,
  createNoopAnalyticsAdapter,
} from './createAnalytics.js';

describe('createAnalytics', () => {
  test('tracks events with platform on the payload', () => {
    const capture = jest.fn();
    const analytics = createAnalytics(
      {capture, identify: jest.fn(), reset: jest.fn()},
      'web',
    );
    analytics.track('recipe_deleted', {recipe_id: 'recipe-1'});
    expect(capture).toHaveBeenCalledWith('recipe_deleted', {
      recipe_id: 'recipe-1',
      platform: 'web',
    });
  });

  test('identifies users through the adapter', () => {
    const identify = jest.fn();
    const reloadFeatureFlags = jest.fn();
    const analytics = createAnalytics(
      {capture: jest.fn(), identify, reset: jest.fn(), reloadFeatureFlags},
      'ios',
    );
    analytics.identifyUser('user-1', {email: 'test@example.com'});
    expect(identify).toHaveBeenCalledWith('user-1', {
      email: 'test@example.com',
    });
    expect(reloadFeatureFlags).toHaveBeenCalled();
  });

  test('exposes feature flags, experiments, errors, and logs', () => {
    const captureException = jest.fn();
    const onFeatureFlags = jest.fn(() => jest.fn());
    const analytics = createAnalytics(
      {
        capture: jest.fn(),
        identify: jest.fn(),
        reset: jest.fn(),
        isFeatureEnabled: jest.fn().mockReturnValue(true),
        getFeatureFlag: jest.fn((key: string) =>
          key === 'flag-b' ? true : 'variant-a',
        ),
        getFeatureFlagPayload: jest.fn().mockReturnValue({color: 'blue'}),
        onFeatureFlags,
        captureException,
        log: jest.fn(),
      },
      'web',
    );
    expect(analytics.isFeatureEnabled('flag-a')).toBe(true);
    expect(analytics.getFeatureFlag('flag-a')).toBe('variant-a');
    expect(analytics.getExperimentVariant('flag-a')).toBe('variant-a');
    expect(analytics.getFeatureFlagPayload('flag-a')).toEqual({color: 'blue'});
    analytics.captureException(new Error('boom'), {
      route: '/recipes',
      password: 'secret',
    });
    expect(captureException).toHaveBeenCalledWith(new Error('boom'), {
      route: '/recipes',
      password: '[redacted]',
    });
    analytics.log('info', 'hello', {count: 1});
    expect(onFeatureFlags).not.toHaveBeenCalled();
    analytics.reloadFeatureFlags();
    expect(analytics.getExperimentVariant('flag-b')).toBeUndefined();
  });

  test('uses noop unsubscribe when feature flag listeners do not return cleanup', () => {
    const onFeatureFlags = jest.fn();
    const analytics = createAnalytics(
      {
        ...createNoopAnalyticsAdapter(),
        onFeatureFlags,
        reloadFeatureFlags: jest.fn(),
      },
      'web',
    );
    expect(() => {
      analytics.onFeatureFlags(() => {});
      analytics.reloadFeatureFlags();
    }).not.toThrow();
  });

  test('merges context app version and build into captureException and log', () => {
    const captureException = jest.fn();
    const log = jest.fn();
    const analytics = createAnalytics(
      {
        capture: jest.fn(),
        identify: jest.fn(),
        reset: jest.fn(),
        captureException,
        log,
      },
      'ios',
      {appVersion: '1.34.4', appBuild: '123'},
    );
    analytics.captureException(new Error('boom'), {route: '/recipes'});
    expect(captureException).toHaveBeenCalledWith(new Error('boom'), {
      app_version: '1.34.4',
      app_build: '123',
      route: '/recipes',
    });
    analytics.captureException(new Error('solo'));
    expect(captureException).toHaveBeenLastCalledWith(new Error('solo'), {
      app_version: '1.34.4',
      app_build: '123',
    });
    analytics.log('info', 'hello', {count: 1});
    expect(log).toHaveBeenCalledWith('info', 'hello', {
      app_version: '1.34.4',
      app_build: '123',
      count: 1,
    });
    analytics.log('warn', 'no-attrs');
    expect(log).toHaveBeenLastCalledWith('warn', 'no-attrs', {
      app_version: '1.34.4',
      app_build: '123',
    });
  });

  test('caller-supplied app version and build win over context', () => {
    const captureException = jest.fn();
    const log = jest.fn();
    const analytics = createAnalytics(
      {
        capture: jest.fn(),
        identify: jest.fn(),
        reset: jest.fn(),
        captureException,
        log,
      },
      'android',
      {appVersion: '1.34.4', appBuild: '123'},
    );
    analytics.captureException(new Error('boom'), {
      app_version: '9.9.9',
      app_build: '999',
    });
    expect(captureException).toHaveBeenCalledWith(new Error('boom'), {
      app_version: '9.9.9',
      app_build: '999',
    });
    analytics.log('error', 'failed', {app_version: '9.9.9'});
    expect(log).toHaveBeenCalledWith('error', 'failed', {
      app_version: '9.9.9',
      app_build: '123',
    });
  });

  test('no-context captureException and log are unchanged', () => {
    const captureException = jest.fn();
    const log = jest.fn();
    const analytics = createAnalytics(
      {
        capture: jest.fn(),
        identify: jest.fn(),
        reset: jest.fn(),
        captureException,
        log,
      },
      'web',
    );
    analytics.captureException(new Error('boom'));
    expect(captureException).toHaveBeenCalledWith(new Error('boom'), undefined);
    analytics.log('info', 'hello');
    expect(log).toHaveBeenCalledWith('info', 'hello', undefined);
  });

  test('null context values are omitted', () => {
    const captureException = jest.fn();
    const log = jest.fn();
    const analytics = createAnalytics(
      {
        capture: jest.fn(),
        identify: jest.fn(),
        reset: jest.fn(),
        captureException,
        log,
      },
      'ios',
      {appVersion: null, appBuild: null},
    );
    analytics.captureException(new Error('boom'));
    expect(captureException).toHaveBeenCalledWith(new Error('boom'), undefined);
    analytics.log('info', 'hello');
    expect(log).toHaveBeenCalledWith('info', 'hello', undefined);
  });

  test('createNoopAnalyticsAdapter does not throw', () => {
    const adapter = createNoopAnalyticsAdapter();
    const analytics = createAnalytics(adapter, 'android');
    expect(() => {
      adapter.capture('recipe_deleted', {recipe_id: 'recipe-1'});
      adapter.identify('user-1');
      adapter.reset();
      analytics.isFeatureEnabled('flag');
      analytics.captureException(new Error('x'));
      analytics.log('warn', 'message');
    }).not.toThrow();
  });
});

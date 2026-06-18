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
        captureException: jest.fn(),
        log: jest.fn(),
      },
      'web',
    );
    expect(analytics.isFeatureEnabled('flag-a')).toBe(true);
    expect(analytics.getFeatureFlag('flag-a')).toBe('variant-a');
    expect(analytics.getExperimentVariant('flag-a')).toBe('variant-a');
    expect(analytics.getFeatureFlagPayload('flag-a')).toEqual({color: 'blue'});
    analytics.captureException(new Error('boom'), {route: '/recipes'});
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

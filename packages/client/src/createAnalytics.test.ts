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
    const analytics = createAnalytics(
      {capture: jest.fn(), identify, reset: jest.fn()},
      'ios',
    );
    analytics.identifyUser('user-1', {email: 'test@example.com'});
    expect(identify).toHaveBeenCalledWith('user-1', {
      email: 'test@example.com',
    });
  });

  test('createNoopAnalyticsAdapter does not throw', () => {
    const adapter = createNoopAnalyticsAdapter();
    expect(() => {
      adapter.capture('recipe_deleted', {recipe_id: 'recipe-1'});
      adapter.identify('user-1');
      adapter.reset();
    }).not.toThrow();
  });
});

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

  test('captures events when PostHog key is configured', () => {
    const capture = jest.fn();
    const identify = jest.fn();
    const reset = jest.fn();
    MockPostHog.mockImplementation(
      () => ({capture, identify, reset}) as unknown as PostHog,
    );
    const client = createAppAnalytics(
      'phc_test',
      'https://us.i.posthog.com',
      'ios',
    );
    client.track('recipe_deleted', {recipe_id: 'recipe-1'});
    expect(MockPostHog).toHaveBeenCalledWith('phc_test', {
      host: 'https://us.i.posthog.com',
    });
    expect(capture).toHaveBeenCalledWith('recipe_deleted', {
      recipe_id: 'recipe-1',
      platform: 'ios',
    });
    client.identifyUser('user-1');
    expect(identify).toHaveBeenCalledWith('user-1', undefined);
    client.reset();
    expect(reset).toHaveBeenCalled();
  });

  test('uses the default PostHog host when host is empty', () => {
    const capture = jest.fn();
    MockPostHog.mockImplementation(
      () =>
        ({
          capture,
          identify: jest.fn(),
          reset: jest.fn(),
        }) as unknown as PostHog,
    );
    const client = createAppAnalytics('phc_test', '', 'android');
    client.track('recipe_deleted', {recipe_id: 'recipe-1'});
    expect(MockPostHog).toHaveBeenCalledWith('phc_test', {
      host: 'https://us.i.posthog.com',
    });
  });

  test('maps the React Native platform to analytics platform', () => {
    expect(['ios', 'android']).toContain(appAnalyticsPlatform);
    expect(resolveAppAnalyticsPlatform('ios')).toBe('ios');
    expect(resolveAppAnalyticsPlatform('android')).toBe('android');
  });
});

import {beforeEach, describe, expect, test, vi} from 'vitest';

import {createWebAnalytics} from './createWebAnalytics.js';

const {posthogInit, posthogCapture, posthogIdentify, posthogReset} = vi.hoisted(
  () => ({
    posthogInit: vi.fn(),
    posthogCapture: vi.fn(),
    posthogIdentify: vi.fn(),
    posthogReset: vi.fn(),
  }),
);

vi.mock('posthog-js', () => ({
  default: {
    init: posthogInit,
    capture: posthogCapture,
    identify: posthogIdentify,
    reset: posthogReset,
  },
}));

describe('createWebAnalytics', () => {
  beforeEach(() => {
    posthogInit.mockClear();
    posthogCapture.mockClear();
    posthogIdentify.mockClear();
    posthogReset.mockClear();
  });

  test('returns a noop client when PostHog key is unset', () => {
    const client = createWebAnalytics('', '');
    expect(client.platform).toBe('web');
    client.track('recipe_deleted', {recipe_id: 'recipe-1'});
    expect(posthogInit).not.toHaveBeenCalled();
    expect(posthogCapture).not.toHaveBeenCalled();
  });

  test('initializes PostHog when key is configured', () => {
    const client = createWebAnalytics('phc_test', 'https://us.i.posthog.com');
    client.track('recipe_deleted', {recipe_id: 'recipe-1'});
    expect(posthogInit).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({api_host: 'https://us.i.posthog.com'}),
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

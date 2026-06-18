import {afterEach, describe, expect, jest, test} from '@jest/globals';

import {
  attachPostHogExpress,
  captureServerException,
  getPostHogClient,
  resetPostHogForTests,
  shutdownPostHog,
} from './posthog.js';

describe('posthog', () => {
  const originalKey = process.env['POSTHOG_KEY'];
  const originalHost = process.env['POSTHOG_HOST'];

  afterEach(() => {
    process.env['POSTHOG_KEY'] = originalKey;
    process.env['POSTHOG_HOST'] = originalHost;
    resetPostHogForTests();
  });

  test('returns null when PostHog key is unset', async () => {
    delete process.env['POSTHOG_KEY'];
    expect(getPostHogClient()).toBeNull();
    captureServerException(new Error('boom'));
    attachPostHogExpress({use: jest.fn()});
    await shutdownPostHog();
  });

  test('attaches express middleware when configured', () => {
    process.env['POSTHOG_KEY'] = 'phc_test';
    delete process.env['POSTHOG_HOST'];
    const use = jest.fn();
    const firstClient = getPostHogClient();
    const secondClient = getPostHogClient();
    expect(firstClient).not.toBeNull();
    expect(secondClient).toBe(firstClient);
    captureServerException(new Error('boom'), 'user-1', {
      route: '/api/recipes',
    });
    attachPostHogExpress({use});
    expect(use).toHaveBeenCalled();
  });
});

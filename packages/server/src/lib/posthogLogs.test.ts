import {afterEach, describe, expect, jest, test} from '@jest/globals';
import nock from 'nock';

import {
  initPostHogLogs,
  serverLog,
  shutdownPostHogLogs,
} from './posthogLogs.js';

describe('posthogLogs', () => {
  const originalKey = process.env['POSTHOG_KEY'];
  const originalHost = process.env['POSTHOG_HOST'];
  const originalEnv = process.env['NODE_ENV'];

  afterEach(async () => {
    nock('https://us.i.posthog.com').post('/i/v1/logs').reply(200, {});
    await shutdownPostHogLogs();
    process.env['POSTHOG_KEY'] = originalKey;
    process.env['POSTHOG_HOST'] = originalHost;
    process.env['NODE_ENV'] = originalEnv;
  });

  test('falls back to console logging when PostHog is disabled', () => {
    delete process.env['POSTHOG_KEY'];
    process.env['NODE_ENV'] = 'development';
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    initPostHogLogs();
    serverLog('error', 'failed', {code: 500});
    serverLog('trace', 'trace message');
    expect(errorSpy).toHaveBeenCalledWith('failed', {code: 500});
    expect(debugSpy).toHaveBeenCalledWith('trace message', undefined);
    errorSpy.mockRestore();
    debugSpy.mockRestore();
  });

  test('skips console logging in test mode when PostHog is disabled', () => {
    process.env['POSTHOG_KEY'] = '';
    process.env['NODE_ENV'] = 'test';
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    serverLog('trace', 'hidden');
    expect(debugSpy).not.toHaveBeenCalled();
    debugSpy.mockRestore();
  });

  test('initializes OTLP logging when PostHog key is configured', () => {
    process.env['POSTHOG_KEY'] = 'phc_test';
    process.env['POSTHOG_HOST'] = 'https://us.i.posthog.com/';
    process.env['NODE_ENV'] = 'test';
    expect(() => {
      initPostHogLogs();
      initPostHogLogs();
      serverLog('info', 'started', {port: 8080});
      serverLog('warn', 'warned');
      serverLog('info', 'no attributes');
    }).not.toThrow();
  });

  test('uses the default PostHog host when POSTHOG_HOST is unset', () => {
    process.env['POSTHOG_KEY'] = 'phc_test';
    delete process.env['POSTHOG_HOST'];
    delete process.env['NODE_ENV'];
    expect(() => {
      initPostHogLogs();
      serverLog('debug', 'debugged');
    }).not.toThrow();
  });

  test('no-ops shutdown when logs were never initialized', async () => {
    await expect(shutdownPostHogLogs()).resolves.toBeUndefined();
  });
});

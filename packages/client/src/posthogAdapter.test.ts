import {
  createPostHogAdapter,
  createPosthogLog,
  DEFAULT_POSTHOG_HOST,
} from './posthogAdapter.js';

describe('posthogAdapter scaffolding', () => {
  test('exposes the shared default PostHog host', () => {
    expect(DEFAULT_POSTHOG_HOST).toBe('https://us.i.posthog.com');
  });

  test('routes log levels to the SDK logger, falling through to error', () => {
    const logger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    const log = createPosthogLog(() => logger);
    log('trace', 'tracing', {a: 1});
    log('debug', 'debugging');
    log('info', 'ready');
    log('warn', 'slow');
    log('error', 'failed');
    expect(logger.trace).toHaveBeenCalledWith('tracing', {a: 1});
    expect(logger.debug).toHaveBeenCalledWith('debugging', undefined);
    expect(logger.info).toHaveBeenCalledWith('ready', undefined);
    expect(logger.warn).toHaveBeenCalledWith('slow', undefined);
    expect(logger.error).toHaveBeenCalledWith('failed', undefined);
  });

  test('builds an adapter that forwards calls to the bindings', () => {
    const bindings = {
      capture: jest.fn(),
      identify: jest.fn(),
      reset: jest.fn(),
      isFeatureEnabled: jest.fn(() => true),
      getFeatureFlag: jest.fn(() => 'on'),
      getFeatureFlagPayload: jest.fn(() => ({x: 1})),
      onFeatureFlags: jest.fn(() => jest.fn()),
      reloadFeatureFlags: jest.fn(),
      captureException: jest.fn(),
      logger: {info: jest.fn(), warn: jest.fn(), error: jest.fn()},
      ensureSessionRecordingForFeedback: jest.fn(),
      getSessionId: jest.fn(() => 'session-1'),
      getSessionReplayUrl: jest.fn(() => 'https://example.com/replay'),
    };
    const adapter = createPostHogAdapter(bindings);
    adapter.capture('event', {count: 2});
    adapter.identify('user-1', {plan: 'pro'});
    adapter.reset();
    adapter.captureException?.(new Error('boom'), {where: 'test'});
    expect(bindings.capture).toHaveBeenCalledWith('event', {count: 2});
    expect(bindings.identify).toHaveBeenCalledWith('user-1', {plan: 'pro'});
    expect(bindings.reset).toHaveBeenCalledTimes(1);
    expect(bindings.captureException).toHaveBeenCalledWith(expect.any(Error), {
      where: 'test',
    });
    expect(adapter.isFeatureEnabled?.('flag')).toBe(true);
    expect(adapter.getFeatureFlag?.('flag')).toBe('on');
    expect(adapter.getFeatureFlagPayload?.('flag')).toEqual({x: 1});
    expect(adapter.getSessionId?.()).toBe('session-1');
    expect(adapter.getSessionReplayUrl?.()).toBe(
      'https://example.com/replay',
    );
    adapter.log?.('info', 'hello');
    expect(bindings.logger.info).toHaveBeenCalledWith('hello', undefined);
  });

  test('omits optional adapter members the bindings do not provide', () => {
    const adapter = createPostHogAdapter({
      capture: jest.fn(),
      identify: jest.fn(),
      reset: jest.fn(),
      logger: {info: jest.fn(), warn: jest.fn(), error: jest.fn()},
    });
    expect(adapter.isFeatureEnabled).toBeUndefined();
    expect(adapter.getSessionReplayUrl).toBeUndefined();
    expect(adapter.captureException).toBeUndefined();
  });
});

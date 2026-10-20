import {assertPaddleConfig, getPaddleConfig} from './paddleConfig.js';

describe('getPaddleConfig', () => {
  test('defaults to the sandbox catalog when nothing is set', () => {
    expect(getPaddleConfig({})).toEqual({
      environment: 'sandbox',
      apiKey: undefined,
      webhookSecret: undefined,
      apiBase: 'https://sandbox-api.paddle.com',
    });
  });

  test('treats any PADDLE_ENVIRONMENT other than "production" as sandbox', () => {
    expect(getPaddleConfig({PADDLE_ENVIRONMENT: 'prod'}).environment).toBe(
      'sandbox',
    );
    expect(getPaddleConfig({PADDLE_ENVIRONMENT: 'SANDBOX'}).environment).toBe(
      'sandbox',
    );
  });

  test('derives the live API base in production mode', () => {
    const config = getPaddleConfig({
      PADDLE_ENVIRONMENT: 'production',
      PADDLE_API_KEY: 'live-key',
      PADDLE_WEBHOOK_SECRET: 'live-secret',
    });
    expect(config.environment).toBe('production');
    expect(config.apiBase).toBe('https://api.paddle.com');
    expect(config.apiKey).toBe('live-key');
    expect(config.webhookSecret).toBe('live-secret');
  });

  test('honours an explicit PADDLE_API_BASE override', () => {
    expect(
      getPaddleConfig({PADDLE_API_BASE: 'https://example.test'}).apiBase,
    ).toBe('https://example.test');
  });

  test('treats blank secrets as unset', () => {
    const config = getPaddleConfig({
      PADDLE_API_KEY: '   ',
      PADDLE_WEBHOOK_SECRET: '',
    });
    expect(config.apiKey).toBeUndefined();
    expect(config.webhookSecret).toBeUndefined();
  });
});

describe('assertPaddleConfig', () => {
  test('accepts sandbox mode with nothing configured', () => {
    expect(() => assertPaddleConfig({})).not.toThrow();
  });

  test('accepts a fully configured production mode', () => {
    expect(() =>
      assertPaddleConfig({
        PADDLE_ENVIRONMENT: 'production',
        PADDLE_API_KEY: 'live-key',
        PADDLE_WEBHOOK_SECRET: 'live-secret',
      }),
    ).not.toThrow();
  });

  test('refuses production mode without the live API key and webhook secret', () => {
    expect(() =>
      assertPaddleConfig({PADDLE_ENVIRONMENT: 'production'}),
    ).toThrow(/PADDLE_API_KEY and PADDLE_WEBHOOK_SECRET are not set/);
    expect(() =>
      assertPaddleConfig({
        PADDLE_ENVIRONMENT: 'production',
        PADDLE_API_KEY: 'live-key',
      }),
    ).toThrow(/PADDLE_WEBHOOK_SECRET is not set/);
    expect(() =>
      assertPaddleConfig({
        PADDLE_ENVIRONMENT: 'production',
        PADDLE_WEBHOOK_SECRET: 'live-secret',
      }),
    ).toThrow(/PADDLE_API_KEY is not set/);
  });

  test('refuses production mode with a sandbox API base', () => {
    expect(() =>
      assertPaddleConfig({
        PADDLE_ENVIRONMENT: 'production',
        PADDLE_API_KEY: 'live-key',
        PADDLE_WEBHOOK_SECRET: 'live-secret',
        PADDLE_API_BASE: 'https://sandbox-api.paddle.com',
      }),
    ).toThrow(/points at the sandbox API/);
  });

  test('refuses production mode with a malformed API base', () => {
    expect(() =>
      assertPaddleConfig({
        PADDLE_ENVIRONMENT: 'production',
        PADDLE_API_KEY: 'live-key',
        PADDLE_WEBHOOK_SECRET: 'live-secret',
        PADDLE_API_BASE: 'api.paddle.com',
      }),
    ).toThrow(/is not a valid URL/);
  });

  test('refuses sandbox mode pointed at the live API base', () => {
    expect(() =>
      assertPaddleConfig({PADDLE_API_BASE: 'https://api.paddle.com'}),
    ).toThrow(/PADDLE_ENVIRONMENT is not "production"/);
  });
});

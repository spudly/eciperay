import {jest} from '@jest/globals';

import {shutdownPostHogLogs} from './posthogLogs.js';
import {
  logServerSecretsOnStartup,
  serverEnvironmentAttributes,
  SERVER_CONFIG_ENV_VARS,
  SERVER_SECRET_ENV_VARS,
  SET_SECRET_VALUE,
  UNSET_CONFIG_VALUE,
} from './serverSecrets.js';

describe('serverEnvironmentAttributes', () => {
  const envSnapshot = {...process.env};

  afterEach(() => {
    process.env = {...envSnapshot};
  });

  test('logs set/unset markers for secrets and values for config', () => {
    process.env['DATABASE_URL'] = 'postgres://example';
    process.env['SUPABASE_URL'] = 'https://example.supabase.co';
    process.env['SUPABASE_SECRET_KEY'] = 'service-role-key';
    process.env['ANTHROPIC_API_KEY'] = 'anthropic-key';
    process.env['CORS_ORIGINS'] = 'https://www.eciperay.com';
    process.env['PORT'] = '9090';
    process.env['HOST'] = '127.0.0.1';
    process.env['NODE_ENV'] = 'production';
    delete process.env['OPENAI_API_KEY'];
    delete process.env['OPENAI_IMAGE_MODEL'];
    delete process.env['POSTHOG_KEY'];
    delete process.env['POSTHOG_HOST'];
    delete process.env['PADDLE_API_KEY'];
    delete process.env['PADDLE_WEBHOOK_SECRET'];
    delete process.env['PADDLE_ENVIRONMENT'];
    delete process.env['PADDLE_API_BASE'];

    expect(serverEnvironmentAttributes()).toEqual({
      DATABASE_URL: SET_SECRET_VALUE,
      SUPABASE_URL: SET_SECRET_VALUE,
      SUPABASE_SECRET_KEY: SET_SECRET_VALUE,
      ANTHROPIC_API_KEY: SET_SECRET_VALUE,
      OPENAI_API_KEY: UNSET_CONFIG_VALUE,
      POSTHOG_KEY: UNSET_CONFIG_VALUE,
      PADDLE_API_KEY: UNSET_CONFIG_VALUE,
      PADDLE_WEBHOOK_SECRET: UNSET_CONFIG_VALUE,
      PADDLE_ENVIRONMENT: UNSET_CONFIG_VALUE,
      PADDLE_API_BASE: UNSET_CONFIG_VALUE,
      OPENAI_IMAGE_MODEL: UNSET_CONFIG_VALUE,
      POSTHOG_HOST: UNSET_CONFIG_VALUE,
      CORS_ORIGINS: 'https://www.eciperay.com',
      PORT: '9090',
      HOST: '127.0.0.1',
      NODE_ENV: 'production',
    });
    expect(JSON.stringify(serverEnvironmentAttributes())).not.toContain(
      'anthropic-key',
    );
  });

  test('treats blank secrets as unset', () => {
    for (const envVar of Object.values(SERVER_SECRET_ENV_VARS)) {
      process.env[envVar] = '   ';
    }

    for (const envVar of Object.values(SERVER_SECRET_ENV_VARS)) {
      expect(serverEnvironmentAttributes()[envVar]).toBe(UNSET_CONFIG_VALUE);
    }
  });

  test('reports unset for missing config values', () => {
    delete process.env['OPENAI_IMAGE_MODEL'];
    delete process.env['POSTHOG_HOST'];
    delete process.env['CORS_ORIGINS'];
    delete process.env['PORT'];
    delete process.env['HOST'];
    delete process.env['NODE_ENV'];

    expect(serverEnvironmentAttributes()).toMatchObject({
      OPENAI_IMAGE_MODEL: UNSET_CONFIG_VALUE,
      POSTHOG_HOST: UNSET_CONFIG_VALUE,
      CORS_ORIGINS: UNSET_CONFIG_VALUE,
      PORT: UNSET_CONFIG_VALUE,
      HOST: UNSET_CONFIG_VALUE,
      NODE_ENV: UNSET_CONFIG_VALUE,
    });
  });

  test('treats blank config values as unset', () => {
    for (const envVar of Object.values(SERVER_CONFIG_ENV_VARS)) {
      process.env[envVar] = '   ';
    }

    for (const envVar of Object.values(SERVER_CONFIG_ENV_VARS)) {
      expect(serverEnvironmentAttributes()[envVar]).toBe(UNSET_CONFIG_VALUE);
    }
  });
});

describe('logServerSecretsOnStartup', () => {
  const envSnapshot = {...process.env};

  afterEach(async () => {
    process.env = {...envSnapshot};
    jest.restoreAllMocks();
    await shutdownPostHogLogs();
  });

  test('logs environment on startup outside test mode', async () => {
    const consoleInfo = jest
      .spyOn(console, 'info')
      .mockImplementation(() => {});
    process.env['NODE_ENV'] = 'production';
    delete process.env['POSTHOG_KEY'];
    process.env['ANTHROPIC_API_KEY'] = 'anthropic-key';
    delete process.env['OPENAI_API_KEY'];

    logServerSecretsOnStartup();

    expect(consoleInfo).toHaveBeenCalledWith(
      'Server environment',
      expect.objectContaining({
        ANTHROPIC_API_KEY: SET_SECRET_VALUE,
        OPENAI_API_KEY: UNSET_CONFIG_VALUE,
        NODE_ENV: 'production',
      }),
    );
  });

  test('does not log during tests', () => {
    const consoleInfo = jest
      .spyOn(console, 'info')
      .mockImplementation(() => {});
    process.env['NODE_ENV'] = 'test';

    logServerSecretsOnStartup();

    expect(consoleInfo).not.toHaveBeenCalled();
  });
});

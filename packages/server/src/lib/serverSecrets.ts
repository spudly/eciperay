import {serverLog} from './posthogLogs.js';

export const SET_SECRET_VALUE = '--set--' as const;
export const UNSET_CONFIG_VALUE = '--unset--' as const;

export const SERVER_SECRET_ENV_VARS = {
  DATABASE_URL: 'DATABASE_URL',
  SUPABASE_URL: 'SUPABASE_URL',
  SUPABASE_SECRET_KEY: 'SUPABASE_SECRET_KEY',
  ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',
  OPENAI_API_KEY: 'OPENAI_API_KEY',
  POSTHOG_KEY: 'POSTHOG_KEY',
} as const;

export const SERVER_CONFIG_ENV_VARS = {
  OPENAI_IMAGE_MODEL: 'OPENAI_IMAGE_MODEL',
  POSTHOG_HOST: 'POSTHOG_HOST',
  CORS_ORIGINS: 'CORS_ORIGINS',
  PORT: 'PORT',
  HOST: 'HOST',
  NODE_ENV: 'NODE_ENV',
} as const;

const readSecretValue = (envVar: string): string =>
  process.env[envVar]?.trim() ? SET_SECRET_VALUE : UNSET_CONFIG_VALUE;

const readConfigValue = (envVar: string): string => {
  const trimmed = process.env[envVar]?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : UNSET_CONFIG_VALUE;
};

export const serverEnvironmentAttributes = (): Record<string, string> => {
  const attributes: Record<string, string> = {};
  for (const envVar of Object.values(SERVER_SECRET_ENV_VARS)) {
    attributes[envVar] = readSecretValue(envVar);
  }
  for (const envVar of Object.values(SERVER_CONFIG_ENV_VARS)) {
    attributes[envVar] = readConfigValue(envVar);
  }
  return attributes;
};

export const logServerSecretsOnStartup = () => {
  if (process.env['NODE_ENV'] === 'test') {
    return;
  }
  serverLog('info', 'Server environment', serverEnvironmentAttributes());
};

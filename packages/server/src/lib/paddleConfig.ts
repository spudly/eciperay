/**
 * Paddle environment configuration — the single switch for the live cutover
 * (see docs/paddle-live-cutover.md).
 *
 * PADDLE_ENVIRONMENT selects the Paddle catalog the server talks to:
 *
 * - 'sandbox' (the default everywhere: local dev, tests, Fly preview apps, and
 *   production until Stephen flips the switch): sandbox API, sandbox API key /
 *   webhook secret, and the sandbox price IDs seeded by migration 017.
 * - 'production' (the Fly production app only, after cutover): live API, live API
 *   key / webhook secret, and the live price IDs seeded by migration 018.
 *
 * The API key and webhook secret are read from PADDLE_API_KEY /
 * PADDLE_WEBHOOK_SECRET in both modes — what changes is which values Stephen
 * puts in those secrets when he flips PADDLE_ENVIRONMENT.
 *
 * In production mode the server refuses to boot (assertPaddleConfig) without
 * the live API key and webhook secret, or with a PADDLE_API_BASE that still
 * points at the sandbox host — live keys against the sandbox API is the classic
 * cutover mistake, and a silently unconfigured webhook would drop paid
 * subscriptions on the floor. In sandbox mode nothing is required: billing
 * endpoints just report "not configured" per request, exactly as before.
 */

export type PaddleEnvironmentName = 'sandbox' | 'production';

export interface PaddleConfig {
  environment: PaddleEnvironmentName;
  apiKey: string | undefined;
  webhookSecret: string | undefined;
  apiBase: string;
}

const SANDBOX_API_BASE = 'https://sandbox-api.paddle.com';
const PRODUCTION_API_BASE = 'https://api.paddle.com';
const SANDBOX_HOST = 'sandbox-api.paddle.com';
const PRODUCTION_HOST = 'api.paddle.com';

type Env = Record<string, string | undefined>;

const nonEmpty = (value: string | undefined): string | undefined =>
  value !== undefined && value.trim().length > 0 ? value : undefined;

export const getPaddleConfig = (env: Env = process.env): PaddleConfig => {
  const environment: PaddleEnvironmentName =
    env['PADDLE_ENVIRONMENT'] === 'production' ? 'production' : 'sandbox';
  return {
    environment,
    apiKey: nonEmpty(env['PADDLE_API_KEY']),
    webhookSecret: nonEmpty(env['PADDLE_WEBHOOK_SECRET']),
    apiBase:
      nonEmpty(env['PADDLE_API_BASE']) ??
      (environment === 'production' ? PRODUCTION_API_BASE : SANDBOX_API_BASE),
  };
};

const apiBaseHost = (apiBase: string): string | null => {
  try {
    return new URL(apiBase).hostname;
  } catch {
    return null;
  }
};

/**
 * Fail loudly on a misconfigured production cutover. Called once at server
 * startup; a no-op in sandbox mode apart from the cross-check that sandbox
 * config never points at the live API host.
 */
export const assertPaddleConfig = (env: Env = process.env): void => {
  const config = getPaddleConfig(env);
  const host = apiBaseHost(config.apiBase);
  if (config.environment === 'sandbox') {
    if (host === PRODUCTION_HOST) {
      throw new Error(
        'Paddle config mismatch: PADDLE_API_BASE points at the live Paddle ' +
          'API (api.paddle.com) while PADDLE_ENVIRONMENT is not "production". ' +
          'Set PADDLE_ENVIRONMENT=production for the live cutover, or point ' +
          'PADDLE_API_BASE at the sandbox API.',
      );
    }
    return;
  }
  const missing: string[] = [];
  if (!config.apiKey) {
    missing.push('PADDLE_API_KEY');
  }
  if (!config.webhookSecret) {
    missing.push('PADDLE_WEBHOOK_SECRET');
  }
  if (missing.length > 0) {
    throw new Error(
      `Paddle live cutover is incomplete: PADDLE_ENVIRONMENT=production but ` +
        `${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} not set. ` +
        'Set the live Paddle secrets (see docs/paddle-live-cutover.md) or ' +
        'unset PADDLE_ENVIRONMENT to stay on sandbox.',
    );
  }
  if (host === SANDBOX_HOST) {
    throw new Error(
      'Paddle config mismatch: PADDLE_ENVIRONMENT=production but ' +
        'PADDLE_API_BASE points at the sandbox API ' +
        '(sandbox-api.paddle.com). Remove PADDLE_API_BASE (the live base ' +
        'is derived from PADDLE_ENVIRONMENT) or set it to ' +
        'https://api.paddle.com.',
    );
  }
};

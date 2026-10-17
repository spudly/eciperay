import pino from 'pino';
import type {Logger, LoggerOptions} from 'pino';
import {pinoHttp} from 'pino-http';
import pretty from 'pino-pretty';

/**
 * Local stdout logging (issue #79).
 *
 * PostHog OTLP (`serverLog` in posthogLogs.ts) remains the production
 * observability pipeline; this logger exists so request access logs and
 * unhandled errors are always visible in the local terminal, independent of
 * whether `POSTHOG_KEY` is configured.
 *
 * Level resolution: `LOG_LEVEL` wins; otherwise `debug` in development, `info`
 * in production, and `silent` in tests.
 */
export const resolveLogLevel = (env: NodeJS.ProcessEnv = process.env): string =>
  env['LOG_LEVEL'] ??
  (env['NODE_ENV'] === 'test'
    ? 'silent'
    : env['NODE_ENV'] === 'production'
      ? 'info'
      : 'debug');

export const createLogger = (
  env: NodeJS.ProcessEnv = process.env,
  destination?: pino.DestinationStream,
): Logger => {
  const options: LoggerOptions = {level: resolveLogLevel(env)};
  if (destination) {
    return pino(options, destination);
  }
  if (env['NODE_ENV'] === 'development') {
    return pino(
      options,
      pretty({colorize: true, translateTime: 'SYS:standard'}),
    );
  }
  return pino(options);
};

export const logger: Logger = createLogger();

/** The health endpoint is polled constantly; keep it out of access logs. */
export const isHealthCheckUrl = (url: string | undefined): boolean =>
  url === '/api/health' || (url?.startsWith('/api/health?') ?? false);

export const createHttpLogger = (log: Logger) =>
  pinoHttp({
    logger: log,
    autoLogging: {ignore: req => isHealthCheckUrl(req.url)},
  });

export const httpLogger = createHttpLogger(logger);

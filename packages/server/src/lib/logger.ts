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
  const options: LoggerOptions = {
    level: resolveLogLevel(env),
    // Access logs must never persist credentials: Authorization carries
    // reusable bearer / personal access tokens, and cookies carry
    // session material. Censor both wherever a request is logged.
    redact: ['req.headers.authorization', 'req.headers.cookie'],
  };
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

/**
 * Access logs keep only the pathname: query strings can carry reusable secrets
 * (e.g. the `t` share token for unlisted recipes).
 */
export const toLoggableUrl = (url: string | undefined): string => {
  if (!url) {
    return '';
  }
  const queryStart = url.indexOf('?');
  return queryStart === -1 ? url : url.slice(0, queryStart);
};

export const createHttpLogger = (log: Logger) =>
  pinoHttp({
    logger: log,
    autoLogging: {ignore: req => isHealthCheckUrl(req.url)},
    serializers: {
      // pino hands custom serializers the standard-serialized request
      // (id, method, url, headers, remoteAddress, remotePort).
      req: req => ({
        id: (req as {id?: unknown}).id,
        method: req.method,
        url: toLoggableUrl(req.url),
        headers: req.headers,
        remoteAddress: (req as {remoteAddress?: string}).remoteAddress,
        remotePort: (req as {remotePort?: number}).remotePort,
      }),
    },
  });

export const httpLogger = createHttpLogger(logger);

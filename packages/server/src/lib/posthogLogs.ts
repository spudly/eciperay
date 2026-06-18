import {logs, SeverityNumber} from '@opentelemetry/api-logs';
import {OTLPLogExporter} from '@opentelemetry/exporter-logs-otlp-http';
import {LoggerProvider, BatchLogRecordProcessor} from '@opentelemetry/sdk-logs';
import {resourceFromAttributes} from '@opentelemetry/resources';

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

export type ServerLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

const severityByLevel: Record<ServerLogLevel, SeverityNumber> = {
  trace: SeverityNumber.TRACE,
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
};

let loggerProvider: LoggerProvider | null = null;

export const initPostHogLogs = () => {
  const apiKey = process.env['POSTHOG_KEY'] ?? '';
  if (apiKey.length === 0 || loggerProvider) {
    return;
  }

  const host = (process.env['POSTHOG_HOST'] ?? DEFAULT_POSTHOG_HOST).replace(
    /\/$/,
    '',
  );
  const environment = process.env['NODE_ENV'] ?? 'development';

  loggerProvider = new LoggerProvider({
    resource: resourceFromAttributes({
      'service.name': 'eciperay-server',
      'deployment.environment': environment,
    }),
    processors: [
      new BatchLogRecordProcessor(
        new OTLPLogExporter({
          url: `${host}/i/v1/logs`,
          headers: {Authorization: `Bearer ${apiKey}`},
        }),
      ),
    ],
  });
  logs.setGlobalLoggerProvider(loggerProvider);
};

export const serverLog = (
  level: ServerLogLevel,
  message: string,
  attributes?: Record<string, string | number | boolean>,
) => {
  if (!loggerProvider) {
    if (process.env['NODE_ENV'] !== 'test') {
      const consoleMethod = level === 'trace' ? 'debug' : level;
      // eslint-disable-next-line no-console -- fallback when PostHog logs are not configured
      console[consoleMethod](message, attributes);
    }
    return;
  }

  const logger = logs.getLogger('eciperay-server');
  logger.emit({
    severityNumber: severityByLevel[level],
    severityText: level,
    body: message,
    attributes,
  });
};

export const shutdownPostHogLogs = async () => {
  if (!loggerProvider) {
    return;
  }
  /* c8 ignore next 3 -- OTLP exporter shutdown flushes over the network */
  await loggerProvider.shutdown();
  loggerProvider = null;
};

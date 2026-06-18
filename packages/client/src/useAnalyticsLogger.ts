import {useMemo} from 'react';

import type {LogLevel} from './createAnalytics.js';
import {useAnalytics} from './AnalyticsProvider.js';

const logLevels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error'];

export type AnalyticsLogger = Record<
  LogLevel,
  (message: string, attributes?: Record<string, unknown>) => void
>;

export const useAnalyticsLogger = (): AnalyticsLogger => {
  const analytics = useAnalytics();

  return useMemo(
    () =>
      Object.fromEntries(
        logLevels.map(level => [
          level,
          (message: string, attributes?: Record<string, unknown>) => {
            analytics.log(level, message, attributes);
          },
        ]),
      ) as AnalyticsLogger,
    [analytics],
  );
};

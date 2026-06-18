import type {
  AnalyticsEventName,
  AnalyticsEventProperties,
  AnalyticsPlatform,
} from './analyticsEvents.js';

export type FeatureFlagValue = boolean | string | undefined;

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

export type AnalyticsAdapter = {
  capture: (event: string, properties: Record<string, unknown>) => void;
  identify: (userId: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
  isFeatureEnabled?: (key: string) => boolean | undefined;
  getFeatureFlag?: (key: string) => FeatureFlagValue;
  getFeatureFlagPayload?: (key: string) => unknown;
  onFeatureFlags?: (callback: () => void) => (() => void) | undefined;
  reloadFeatureFlags?: () => void;
  captureException?: (
    error: unknown,
    properties?: Record<string, unknown>,
  ) => void;
  log?: (
    level: LogLevel,
    message: string,
    attributes?: Record<string, unknown>,
  ) => void;
};

const noopAnalyticsAction = () => {
  void 0;
};

export const createNoopAnalyticsAdapter = (): AnalyticsAdapter => ({
  capture: noopAnalyticsAction,
  identify: noopAnalyticsAction,
  reset: noopAnalyticsAction,
});

const createTrack =
  (adapter: AnalyticsAdapter, platform: AnalyticsPlatform) =>
  <E extends AnalyticsEventName>(
    event: E,
    properties: AnalyticsEventProperties[E],
  ) => {
    adapter.capture(event, {...properties, platform});
  };

const createIdentifyUser = (adapter: AnalyticsAdapter) => {
  return (userId: string, traits?: {email?: string | null}) => {
    adapter.identify(userId, traits);
    adapter.reloadFeatureFlags?.();
  };
};

const createOnFeatureFlags = (adapter: AnalyticsAdapter) => {
  return (callback: () => void) => {
    const unsubscribe = adapter.onFeatureFlags?.(callback);
    return typeof unsubscribe === 'function'
      ? unsubscribe
      : noopAnalyticsAction;
  };
};

const createGetExperimentVariant = (adapter: AnalyticsAdapter) => {
  return (key: string): string | undefined => {
    const value = adapter.getFeatureFlag?.(key);
    if (typeof value === 'string') {
      return value;
    }
    return undefined;
  };
};

const createCaptureException = (adapter: AnalyticsAdapter) => {
  return (error: unknown, properties?: Record<string, unknown>) => {
    adapter.captureException?.(error, properties);
  };
};

const createLog = (adapter: AnalyticsAdapter) => {
  return (
    level: LogLevel,
    message: string,
    attributes?: Record<string, unknown>,
  ) => {
    adapter.log?.(level, message, attributes);
  };
};

export const createAnalytics = (
  adapter: AnalyticsAdapter,
  platform: AnalyticsPlatform,
) => ({
  track: createTrack(adapter, platform),
  identifyUser: createIdentifyUser(adapter),
  reset: adapter.reset,
  platform,
  isFeatureEnabled: (key: string) => adapter.isFeatureEnabled?.(key),
  getFeatureFlag: (key: string) => adapter.getFeatureFlag?.(key),
  getFeatureFlagPayload: (key: string) => adapter.getFeatureFlagPayload?.(key),
  getExperimentVariant: createGetExperimentVariant(adapter),
  onFeatureFlags: createOnFeatureFlags(adapter),
  reloadFeatureFlags: () => {
    adapter.reloadFeatureFlags?.();
  },
  captureException: createCaptureException(adapter),
  log: createLog(adapter),
});

export type AnalyticsClient = ReturnType<typeof createAnalytics>;

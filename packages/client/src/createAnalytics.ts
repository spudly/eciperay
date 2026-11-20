import type {
  AnalyticsEventName,
  AnalyticsEventProperties,
  AnalyticsPlatform,
} from './analyticsEvents.js';
import {sanitizeAnalyticsProperties} from './sanitizeAnalyticsProperties.js';
import {
  submitUserFeedback as submitUserFeedbackImpl,
  type SubmitUserFeedbackInput,
} from './submitUserFeedback.js';

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
  ensureSessionRecordingForFeedback?: () => void | Promise<void>;
  getSessionId?: () => string | undefined;
  getSessionReplayUrl?: () => string | undefined;
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

export type AnalyticsContext = {
  appVersion?: string | null;
  appBuild?: string | null;
};

const buildContextProperties = (
  context?: AnalyticsContext,
): Record<string, unknown> => {
  const properties: Record<string, unknown> = {};
  if (context?.appVersion) {
    properties['app_version'] = context.appVersion;
  }
  if (context?.appBuild) {
    properties['app_build'] = context.appBuild;
  }
  return properties;
};

const createCaptureException = (
  adapter: AnalyticsAdapter,
  context?: AnalyticsContext,
) => {
  const contextProperties = buildContextProperties(context);
  return (error: unknown, properties?: Record<string, unknown>) => {
    const sanitized = sanitizeAnalyticsProperties(properties);
    if (Object.keys(contextProperties).length === 0) {
      adapter.captureException?.(error, sanitized);
      return;
    }
    adapter.captureException?.(error, {
      ...contextProperties,
      ...(sanitized ?? {}),
    });
  };
};

const createLog = (adapter: AnalyticsAdapter, context?: AnalyticsContext) => {
  const contextProperties = buildContextProperties(context);
  return (
    level: LogLevel,
    message: string,
    attributes?: Record<string, unknown>,
  ) => {
    if (Object.keys(contextProperties).length === 0) {
      adapter.log?.(level, message, attributes);
      return;
    }
    adapter.log?.(level, message, {
      ...contextProperties,
      ...(attributes ?? {}),
    });
  };
};

export const createAnalytics = (
  adapter: AnalyticsAdapter,
  platform: AnalyticsPlatform,
  context?: AnalyticsContext,
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
  captureException: createCaptureException(adapter, context),
  log: createLog(adapter, context),
  submitUserFeedback: (input: SubmitUserFeedbackInput) =>
    submitUserFeedbackImpl(adapter, platform, input),
});

export type AnalyticsClient = ReturnType<typeof createAnalytics>;

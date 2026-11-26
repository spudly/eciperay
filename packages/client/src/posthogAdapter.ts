import type {AnalyticsAdapter, LogLevel} from './createAnalytics.js';

export const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

export type PostHogProperties = Record<string, string | number | boolean>;

/**
 * Both PostHog SDKs (posthog-js, posthog-react-native) accept only scalar
 * property values at runtime despite the shared adapter's wider type; the
 * hosts historically cast in exactly this spot.
 */
export const castPostHogProperties = (
  properties?: Record<string, unknown>,
): PostHogProperties => properties as PostHogProperties;

export type PostHogLogger = {
  trace?: (message: string, attributes?: PostHogProperties) => void;
  debug?: (message: string, attributes?: PostHogProperties) => void;
  info: (message: string, attributes?: PostHogProperties) => void;
  warn: (message: string, attributes?: PostHogProperties) => void;
  error: (message: string, attributes?: PostHogProperties) => void;
};

/**
 * The level-router both hosts wrote around their SDK's logger: trace/debug
 * are optional on the SDK logger, every other level falls through to error.
 * The logger is resolved per call, matching the hosts' previous behavior of
 * reading `client.logger` / `posthog.logger` at log time.
 */
export const createPosthogLog = (
  getLogger: () => PostHogLogger,
): NonNullable<AnalyticsAdapter['log']> => {
  return (
    level: LogLevel,
    message: string,
    attributes?: Record<string, unknown>,
  ) => {
    const logAttributes = castPostHogProperties(attributes);
    const logger = getLogger();
    if (level === 'trace' && typeof logger.trace === 'function') {
      logger.trace(message, logAttributes);
      return;
    }
    if (level === 'debug' && typeof logger.debug === 'function') {
      logger.debug(message, logAttributes);
      return;
    }
    if (level === 'info') {
      logger.info(message, logAttributes);
      return;
    }
    if (level === 'warn') {
      logger.warn(message, logAttributes);
      return;
    }
    logger.error(message, logAttributes);
  };
};

/**
 * The raw SDK-side surface a host binds to build its AnalyticsAdapter.
 * Property records arrive already cast to the SDKs' scalar shape; flag,
 * session, and recording calls stay host-side because the two SDKs differ.
 */
export type PostHogAdapterBindings = {
  capture: (event: string, properties: PostHogProperties) => void;
  identify: (userId: string, properties?: PostHogProperties) => void;
  reset: () => void;
  isFeatureEnabled?: AnalyticsAdapter['isFeatureEnabled'];
  getFeatureFlag?: AnalyticsAdapter['getFeatureFlag'];
  getFeatureFlagPayload?: AnalyticsAdapter['getFeatureFlagPayload'];
  onFeatureFlags?: AnalyticsAdapter['onFeatureFlags'];
  reloadFeatureFlags?: AnalyticsAdapter['reloadFeatureFlags'];
  captureException?: (
    error: unknown,
    properties?: PostHogProperties,
  ) => void;
  logger: PostHogLogger | (() => PostHogLogger);
  ensureSessionRecordingForFeedback?: AnalyticsAdapter['ensureSessionRecordingForFeedback'];
  getSessionId?: AnalyticsAdapter['getSessionId'];
  getSessionReplayUrl?: AnalyticsAdapter['getSessionReplayUrl'];
};

/**
 * Builds the shared AnalyticsAdapter shape from a host's SDK bindings:
 * property casting and log routing live here, once, instead of in parallel
 * copies in the web and app hosts.
 */
export const createPostHogAdapter = (
  bindings: PostHogAdapterBindings,
): AnalyticsAdapter => {
  const getLogger =
    typeof bindings.logger === 'function'
      ? (bindings.logger as () => PostHogLogger)
      : () => bindings.logger as PostHogLogger;
  const adapter: AnalyticsAdapter = {
    capture: (event, properties) => {
      bindings.capture(event, castPostHogProperties(properties));
    },
    identify: (userId, properties) => {
      bindings.identify(userId, castPostHogProperties(properties));
    },
    reset: () => {
      bindings.reset();
    },
    log: createPosthogLog(getLogger),
  };
  if (bindings.isFeatureEnabled) {
    adapter.isFeatureEnabled = bindings.isFeatureEnabled;
  }
  if (bindings.getFeatureFlag) {
    adapter.getFeatureFlag = bindings.getFeatureFlag;
  }
  if (bindings.getFeatureFlagPayload) {
    adapter.getFeatureFlagPayload = bindings.getFeatureFlagPayload;
  }
  if (bindings.onFeatureFlags) {
    adapter.onFeatureFlags = bindings.onFeatureFlags;
  }
  if (bindings.reloadFeatureFlags) {
    adapter.reloadFeatureFlags = bindings.reloadFeatureFlags;
  }
  if (bindings.captureException) {
    const captureException = bindings.captureException;
    adapter.captureException = (error, properties) => {
      captureException(error, castPostHogProperties(properties));
    };
  }
  if (bindings.ensureSessionRecordingForFeedback) {
    adapter.ensureSessionRecordingForFeedback =
      bindings.ensureSessionRecordingForFeedback;
  }
  if (bindings.getSessionId) {
    adapter.getSessionId = bindings.getSessionId;
  }
  if (bindings.getSessionReplayUrl) {
    adapter.getSessionReplayUrl = bindings.getSessionReplayUrl;
  }
  return adapter;
};

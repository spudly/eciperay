import {
  createAnalytics,
  createNoopAnalyticsAdapter,
  type AnalyticsAdapter,
  type AnalyticsClient,
  type AnalyticsPlatform,
  type LogLevel,
} from '@eciperay/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PostHog from 'posthog-react-native';
import {Platform} from 'react-native';

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

const castPostHogProperties = (
  properties?: Record<string, unknown>,
): Record<string, string | number | boolean> =>
  properties as Record<string, string | number | boolean>;

export const resolveAppAnalyticsPlatform = (
  os: typeof Platform.OS,
): AnalyticsPlatform => {
  if (os === 'ios') {
    return 'ios';
  }
  return 'android';
};

const posthogLog = (
  client: PostHog,
  level: LogLevel,
  message: string,
  attributes?: Record<string, unknown>,
) => {
  const logAttributes = attributes as Record<string, string | number | boolean>;
  const logger = client.logger;
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

const getAppFeatureFlagPayload = (client: PostHog, key: string): unknown => {
  if (typeof client.getFeatureFlagResult === 'function') {
    const result = client.getFeatureFlagResult(key) as
      | {payload?: unknown}
      | undefined;
    return result?.payload;
  }
  /* eslint-disable-next-line @typescript-eslint/no-deprecated -- older RN SDKs only expose getFeatureFlagPayload */
  return client.getFeatureFlagPayload(key);
};

const createAppPostHogAdapter = (client: PostHog): AnalyticsAdapter => ({
  capture: (event, properties) => {
    client.capture(event, castPostHogProperties(properties));
  },
  identify: (userId, properties) => {
    client.identify(userId, castPostHogProperties(properties));
  },
  reset: () => {
    client.reset();
  },
  isFeatureEnabled: key => client.isFeatureEnabled(key),
  getFeatureFlag: key => client.getFeatureFlag(key),
  getFeatureFlagPayload: key => getAppFeatureFlagPayload(client, key),
  onFeatureFlags: callback => client.onFeatureFlags(callback),
  reloadFeatureFlags: () => {
    client.reloadFeatureFlags();
  },
  captureException: (error, properties) => {
    client.captureException(error, castPostHogProperties(properties));
  },
  log: (level, message, attributes) => {
    posthogLog(client, level, message, attributes);
  },
  ensureSessionRecordingForFeedback: async () => {
    await client.startSessionRecording(true);
  },
  getSessionId: () => client.getSessionId(),
});

const createAppPostHogClient = (
  apiKey: string,
  apiHost: string,
  platform: AnalyticsPlatform,
) => {
  return new PostHog(apiKey, {
    host: apiHost,
    customStorage: AsyncStorage,
    enableSessionReplay: true,
    errorTracking: {
      autocapture: {
        uncaughtExceptions: true,
        unhandledRejections: true,
        nativeCrashes: true,
      },
    },
    logs: {
      serviceName: 'eciperay-app',
      environment: __DEV__ ? 'development' : 'production',
      resourceAttributes: {platform},
    },
  });
};

const createPostHogAdapter = (
  apiKey: string,
  apiHost: string,
  platform: AnalyticsPlatform,
): AnalyticsAdapter => {
  const client = createAppPostHogClient(apiKey, apiHost, platform);
  return createAppPostHogAdapter(client);
};

export const createAppAnalytics = (
  apiKey: string,
  apiHost: string,
  platform: AnalyticsPlatform,
): AnalyticsClient => {
  if (apiKey.length === 0) {
    return createAnalytics(createNoopAnalyticsAdapter(), platform);
  }
  return createAnalytics(
    createPostHogAdapter(apiKey, apiHost || DEFAULT_POSTHOG_HOST, platform),
    platform,
  );
};

export const appAnalyticsPlatform = resolveAppAnalyticsPlatform(Platform.OS);

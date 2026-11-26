import {
  castPostHogProperties,
  createAnalytics,
  createNoopAnalyticsAdapter,
  createPostHogAdapter as createSharedPostHogAdapter,
  DEFAULT_POSTHOG_HOST,
  type AnalyticsAdapter,
  type AnalyticsClient,
  type AnalyticsContext,
  type AnalyticsPlatform,
} from '@eciperay/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import PostHog from 'posthog-react-native';
import {Platform} from 'react-native';

export const resolveAppAnalyticsPlatform = (
  os: typeof Platform.OS,
): AnalyticsPlatform => {
  if (os === 'ios') {
    return 'ios';
  }
  return 'android';
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

const createAppPostHogAdapter = (
  client: PostHog,
  superProperties?: Record<string, unknown>,
): AnalyticsAdapter =>
  createSharedPostHogAdapter({
    capture: (event, properties) => {
      client.capture(event, properties);
    },
    identify: (userId, properties) => {
      client.identify(userId, properties);
    },
    reset: () => {
      client.reset();
      // PostHog clears registered super properties on reset; re-register the
      // app metadata so automatically captured events keep carrying it.
      if (superProperties && Object.keys(superProperties).length > 0) {
        client.register?.(castPostHogProperties(superProperties));
      }
    },
    isFeatureEnabled: key => client.isFeatureEnabled(key),
    getFeatureFlag: key => client.getFeatureFlag(key),
    getFeatureFlagPayload: key => getAppFeatureFlagPayload(client, key),
    onFeatureFlags: callback => client.onFeatureFlags(callback),
    reloadFeatureFlags: () => {
      client.reloadFeatureFlags();
    },
    captureException: (error, properties) => {
      client.captureException(error, properties);
    },
    logger: () => client.logger,
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

export const getAppAnalyticsContext = (): AnalyticsContext => {
  const context: AnalyticsContext = {};
  if (Application.nativeApplicationVersion) {
    context.appVersion = Application.nativeApplicationVersion;
  }
  if (Application.nativeBuildVersion) {
    context.appBuild = Application.nativeBuildVersion;
  }
  return context;
};

const buildSuperProperties = (
  context: AnalyticsContext,
): Record<string, unknown> => {
  const properties: Record<string, unknown> = {};
  if (context.appVersion) {
    properties['app_version'] = context.appVersion;
  }
  if (context.appBuild) {
    properties['app_build'] = context.appBuild;
  }
  return properties;
};

const createPostHogAdapter = (
  apiKey: string,
  apiHost: string,
  platform: AnalyticsPlatform,
  context: AnalyticsContext,
): AnalyticsAdapter => {
  const client = createAppPostHogClient(apiKey, apiHost, platform);
  const superProperties = buildSuperProperties(context);
  if (Object.keys(superProperties).length > 0) {
    client.register?.(castPostHogProperties(superProperties));
  }
  return createAppPostHogAdapter(client, superProperties);
};

export const createAppAnalytics = (
  apiKey: string,
  apiHost: string,
  platform: AnalyticsPlatform,
): AnalyticsClient => {
  const context = getAppAnalyticsContext();
  if (apiKey.length === 0) {
    return createAnalytics(createNoopAnalyticsAdapter(), platform, context);
  }
  return createAnalytics(
    createPostHogAdapter(
      apiKey,
      apiHost || DEFAULT_POSTHOG_HOST,
      platform,
      context,
    ),
    platform,
    context,
  );
};

export const appAnalyticsPlatform = resolveAppAnalyticsPlatform(Platform.OS);

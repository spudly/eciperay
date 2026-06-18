import {
  createAnalytics,
  createNoopAnalyticsAdapter,
  type AnalyticsAdapter,
  type AnalyticsClient,
  type AnalyticsPlatform,
} from '@eciperay/client';
import PostHog from 'posthog-react-native';
import {Platform} from 'react-native';

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

export const resolveAppAnalyticsPlatform = (
  os: typeof Platform.OS,
): AnalyticsPlatform => {
  if (os === 'ios') {
    return 'ios';
  }
  return 'android';
};

export const createPostHogAdapter = (
  apiKey: string,
  apiHost: string,
): AnalyticsAdapter => {
  const client = new PostHog(apiKey, {host: apiHost});
  return {
    capture: (event, properties) => {
      client.capture(
        event,
        properties as Record<string, string | number | boolean>,
      );
    },
    identify: (userId, properties) => {
      client.identify(
        userId,
        properties as Record<string, string | number | boolean>,
      );
    },
    reset: () => {
      client.reset();
    },
  };
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
    createPostHogAdapter(apiKey, apiHost || DEFAULT_POSTHOG_HOST),
    platform,
  );
};

export const appAnalyticsPlatform = resolveAppAnalyticsPlatform(Platform.OS);

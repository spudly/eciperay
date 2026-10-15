import {
  createAnalytics,
  createNoopAnalyticsAdapter,
  sanitizePostHogEventProperties,
  type AnalyticsAdapter,
  type AnalyticsClient,
  type LogLevel,
} from '@eciperay/client';
import posthog from 'posthog-js';

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';
const POSTHOG_UI_HOST = 'https://us.posthog.com';

type PostHogFlagResult = {value?: boolean | string; payload?: unknown};

const getPostHogFlagResult = (key: string): PostHogFlagResult | undefined => {
  return posthog.getFeatureFlagResult(key);
};

const posthogLog = (
  level: LogLevel,
  message: string,
  attributes?: Record<string, unknown>,
) => {
  const logAttributes = attributes as Record<string, string | number | boolean>;
  const logger = posthog.logger;
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

const initWebPostHog = (apiKey: string, apiHost: string) => {
  posthog.init(apiKey, {
    api_host: apiHost,
    ui_host: POSTHOG_UI_HOST,
    defaults: '2026-01-30',
    capture_pageview: 'history_change',
    capture_pageleave: true,
    persistence: 'localStorage',
    person_profiles: 'identified_only',
    disable_web_experiments: false,
    session_recording: {maskAllInputs: true},
    enable_recording_console_log: true,
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
    },
    logs: {serviceName: 'eciperay-web', environment: import.meta.env.MODE},
    before_send: event => {
      // posthog-js types the event as non-nullable, but it can pass null at
      // runtime; the test suite pins the null-passthrough behavior.
      if (!event) {
        return event;
      }
      event.properties =
        sanitizePostHogEventProperties(event.properties) ?? event.properties;
      return event;
    },
  });
};

const getWebSessionReplayUrl = () =>
  posthog.get_session_replay_url({withTimestamp: true, timestampLookBack: 30});

const createWebPostHogAdapter = (): AnalyticsAdapter => ({
  capture: (event, properties) => {
    posthog.capture(event, properties);
  },
  identify: (userId, properties) => {
    posthog.identify(userId, properties);
  },
  reset: () => {
    posthog.reset();
  },
  isFeatureEnabled: key => posthog.isFeatureEnabled(key) ?? false,
  getFeatureFlag: key => getPostHogFlagResult(key)?.value,
  getFeatureFlagPayload: key => getPostHogFlagResult(key)?.payload,
  onFeatureFlags: callback => posthog.onFeatureFlags(callback),
  reloadFeatureFlags: () => {
    posthog.reloadFeatureFlags();
  },
  captureException: (error, properties) => {
    posthog.captureException(error, properties);
  },
  log: posthogLog,
  ensureSessionRecordingForFeedback: () => {
    posthog.startSessionRecording(true);
  },
  getSessionId: () => posthog.get_session_id(),
  getSessionReplayUrl: getWebSessionReplayUrl,
});

export const createPostHogAdapter = (
  apiKey: string,
  apiHost: string,
): AnalyticsAdapter => {
  initWebPostHog(apiKey, apiHost);
  return createWebPostHogAdapter();
};

export const createWebAnalytics = (
  apiKey: string,
  apiHost: string,
): AnalyticsClient => {
  if (apiKey.length === 0) {
    return createAnalytics(createNoopAnalyticsAdapter(), 'web');
  }
  return createAnalytics(
    createPostHogAdapter(apiKey, apiHost || DEFAULT_POSTHOG_HOST),
    'web',
  );
};

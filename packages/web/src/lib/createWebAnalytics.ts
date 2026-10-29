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
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- posthog-js can pass null at runtime despite its non-nullable types; the tests pin the null-passthrough behavior
      if (!event) {
        return event;
      }
      event.properties =
        sanitizePostHogEventProperties(event.properties) ?? event.properties;
      return event;
    },
  });
  // A previous disableWebPostHog() in this page session opted the SDK out;
  // init alone does not undo that, so opt back in explicitly.
  posthog.opt_in_capturing();
};

/**
 * Stops all PostHog collection for the rest of this page session: no event
 * capture, no session recording, and the identified person is reset. Called
 * when analytics consent is declined after PostHog was already enabled. The
 * opt-out brackets the identity reset on both sides, for two different
 * reasons:
 *
 * - Before reset(): reset() flushes buffered session-replay snapshots
 *   (flushBeforeIdentityReset) through capture(), which drops them when
 *   capturing is opted out — so replay recorded under the old consent is
 *   discarded instead of being sent at the moment consent is withdrawn.
 * - After reset(): reset() clears the SDK's stored state, including the opt-out
 *   recorded before it, so the opt-out must be re-applied for it to be the
 *   state that survives.
 */
export const disableWebPostHog = () => {
  posthog.opt_out_capturing();
  posthog.reset();
  posthog.opt_out_capturing();
  posthog.stopSessionRecording();
};

/**
 * Restarts session recording after a disable stopped it. Called when analytics
 * is re-enabled in a page session where disableWebPostHog() ran; init + opt-in
 * alone do not reliably resume a stopped recording.
 */
export const resumeWebSessionRecording = () => {
  posthog.startSessionRecording();
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

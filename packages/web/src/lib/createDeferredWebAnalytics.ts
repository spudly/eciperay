import {
  createAnalytics,
  createNoopAnalyticsAdapter,
  type AnalyticsClient,
} from '@eciperay/client';

import {
  createPostHogAdapter,
  disableWebPostHog,
  resumeWebSessionRecording,
} from './createWebAnalytics.js';
import {createSwitchableAnalyticsAdapter} from './switchableAnalyticsAdapter.js';

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

export const createDeferredWebAnalytics = (
  apiKey: string,
  apiHost: string,
): {
  analytics: AnalyticsClient;
  enablePostHog: () => void;
  disablePostHog: () => void;
} => {
  if (apiKey.length === 0) {
    return {
      analytics: createAnalytics(createNoopAnalyticsAdapter(), 'web'),
      enablePostHog: () => {
        void 0;
      },
      disablePostHog: () => {
        void 0;
      },
    };
  }

  const {adapter, setAdapter} = createSwitchableAnalyticsAdapter();
  let enabled = false;
  let disabledOnce = false;
  const enablePostHog = () => {
    if (enabled) {
      return;
    }
    enabled = true;
    setAdapter(createPostHogAdapter(apiKey, apiHost || DEFAULT_POSTHOG_HOST));
    if (disabledOnce) {
      // A previous disable stopped session recording; init + opt-in alone
      // do not reliably resume it, so restart it explicitly.
      disabledOnce = false;
      resumeWebSessionRecording();
    }
  };
  const disablePostHog = () => {
    if (!enabled) {
      return;
    }
    enabled = false;
    disabledOnce = true;
    // Swap back to the noop adapter first so no analytics call in flight can
    // reach PostHog, then opt the SDK itself out (capture + session
    // recording) and reset its identified state.
    setAdapter(createNoopAnalyticsAdapter());
    disableWebPostHog();
  };

  return {
    analytics: createAnalytics(adapter, 'web'),
    enablePostHog,
    disablePostHog,
  };
};

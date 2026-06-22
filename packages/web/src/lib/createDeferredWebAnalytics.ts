import {
  createAnalytics,
  createNoopAnalyticsAdapter,
  type AnalyticsClient,
} from '@eciperay/client';

import {createPostHogAdapter} from './createWebAnalytics.js';
import {createSwitchableAnalyticsAdapter} from './switchableAnalyticsAdapter.js';

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

export const createDeferredWebAnalytics = (
  apiKey: string,
  apiHost: string,
): {analytics: AnalyticsClient; enablePostHog: () => void} => {
  if (apiKey.length === 0) {
    return {
      analytics: createAnalytics(createNoopAnalyticsAdapter(), 'web'),
      enablePostHog: () => {
        void 0;
      },
    };
  }

  const {adapter, setAdapter} = createSwitchableAnalyticsAdapter();
  let enabled = false;
  const enablePostHog = () => {
    if (enabled) {
      return;
    }
    enabled = true;
    setAdapter(createPostHogAdapter(apiKey, apiHost || DEFAULT_POSTHOG_HOST));
  };

  return {analytics: createAnalytics(adapter, 'web'), enablePostHog};
};

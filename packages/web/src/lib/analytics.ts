import {readAnalyticsConsent} from '@eciperay/client';

import {createDeferredWebAnalytics} from './createDeferredWebAnalytics.js';
import {POSTHOG_HOST, POSTHOG_KEY} from './env.js';

export {createDeferredWebAnalytics} from './createDeferredWebAnalytics.js';
export {createWebAnalytics} from './createWebAnalytics.js';

const {analytics, enablePostHog} = createDeferredWebAnalytics(
  POSTHOG_KEY,
  POSTHOG_HOST,
);

if (readAnalyticsConsent() === 'accepted') {
  enablePostHog();
}

export {analytics, enablePostHog};

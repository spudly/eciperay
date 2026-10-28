import {identifyAnalyticsUser, readAnalyticsConsent} from '@eciperay/client';
import type {Session} from '@supabase/supabase-js';

import {createDeferredWebAnalytics} from './createDeferredWebAnalytics.js';
import {POSTHOG_HOST, POSTHOG_KEY} from './env.js';

export {createDeferredWebAnalytics} from './createDeferredWebAnalytics.js';
export {createWebAnalytics} from './createWebAnalytics.js';

const {analytics, enablePostHog, disablePostHog} = createDeferredWebAnalytics(
  POSTHOG_KEY,
  POSTHOG_HOST,
);

if (readAnalyticsConsent() === 'accepted') {
  enablePostHog();
}

export const identifyAnalyticsUserIfConsented = (session: Session) => {
  if (readAnalyticsConsent() === 'accepted') {
    identifyAnalyticsUser(analytics, session);
  }
};

export {analytics, enablePostHog, disablePostHog};

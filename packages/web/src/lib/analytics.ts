import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  identifyAnalyticsUser,
  readAnalyticsConsent,
} from '@eciperay/client';
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

// Consent is shared across tabs via localStorage, but this tab's PostHog
// state only changes when this tab acts. Follow changes made in other tabs:
// a decline elsewhere must stop this tab's collection too (its own
// disablePostHog() call happens in the tab that wrote the value, and the
// `storage` event fires only in the other tabs), and an accept elsewhere
// enables this tab the same way a fresh load would.
window.addEventListener('storage', event => {
  if (event.key !== ANALYTICS_CONSENT_STORAGE_KEY) {
    return;
  }
  if (event.newValue === 'accepted') {
    enablePostHog();
  } else if (event.newValue === 'declined') {
    disablePostHog();
  }
});

export const identifyAnalyticsUserIfConsented = (session: Session) => {
  if (readAnalyticsConsent() === 'accepted') {
    identifyAnalyticsUser(analytics, session);
  }
};

export {analytics, enablePostHog, disablePostHog};

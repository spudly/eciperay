import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  identifyAnalyticsUser,
  notifyAnalyticsConsentListeners,
  readAnalyticsConsent,
  subscribeAnalyticsConsent,
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

const applyConsentToPostHog = (status: string | null) => {
  if (status === 'accepted') {
    enablePostHog();
  } else {
    // Declined or withdrawn (undecided): analytics stays/goes off until a
    // new accept (#408 — withdraw must take effect without a reload).
    disablePostHog();
  }
};

// Same-tab changes (banner, Profile, consent preferences page) notify
// through the client consent registry, so a decline or withdraw from any
// surface disables PostHog immediately in this tab too.
subscribeAnalyticsConsent(status => {
  applyConsentToPostHog(status);
});

// Consent is shared across tabs via localStorage, but this tab's PostHog
// state only changes when this tab acts. Follow changes made in other tabs:
// a decline or withdraw elsewhere must stop this tab's collection too (its
// own disablePostHog() call happens in the tab that wrote the value, and the
// `storage` event fires only in the other tabs), and an accept elsewhere
// enables this tab the same way a fresh load would. A withdraw removes the
// key, so the event's newValue is null.
window.addEventListener('storage', event => {
  if (event.key !== ANALYTICS_CONSENT_STORAGE_KEY) {
    return;
  }
  // Route through the consent registry (whose subscriber above applies
  // the change to PostHog) so the banner and the preferences surfaces in
  // this tab follow cross-tab changes too, not just the PostHog switch.
  notifyAnalyticsConsentListeners(
    event.newValue === 'accepted' || event.newValue === 'declined'
      ? event.newValue
      : null,
  );
});

export const identifyAnalyticsUserIfConsented = (session: Session) => {
  if (readAnalyticsConsent() === 'accepted') {
    identifyAnalyticsUser(analytics, session);
  }
};

export {analytics, enablePostHog, disablePostHog};

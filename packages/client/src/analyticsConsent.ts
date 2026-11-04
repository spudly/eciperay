export const ANALYTICS_CONSENT_STORAGE_KEY = 'eciperay.analyticsConsent';

export type AnalyticsConsentStatus = 'accepted' | 'declined';

export type AnalyticsConsentListener = (
  status: AnalyticsConsentStatus | null,
) => void;

const listeners = new Set<AnalyticsConsentListener>();

/**
 * Notify subscribers of a consent value learned outside this tab's own writes
 * (the web host calls this from its `storage` listener when another tab
 * accepts, declines, or withdraws, so in-tab surfaces and the analytics switch
 * follow cross-tab changes too).
 */
export const notifyAnalyticsConsentListeners = (
  status: AnalyticsConsentStatus | null,
) => {
  for (const listener of listeners) {
    listener(status);
  }
};

/**
 * Subscribe to consent changes made in this session (any surface: the banner,
 * Profile preferences, or the consent preferences page). The browser `storage`
 * event only fires in other tabs, so surfaces in the same tab stay in sync
 * through this registry instead. Returns an unsubscribe function.
 */
export const subscribeAnalyticsConsent = (
  listener: AnalyticsConsentListener,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const readAnalyticsConsent = (): AnalyticsConsentStatus | null => {
  const value = localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
  if (value === 'accepted' || value === 'declined') {
    return value;
  }
  return null;
};

export const writeAnalyticsConsent = (status: AnalyticsConsentStatus) => {
  localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, status);
  notifyAnalyticsConsentListeners(status);
};

/**
 * Withdraw consent: remove the stored choice so the browser returns to the
 * undecided state (eciperay#408). Analytics must be off until a new choice is
 * made, and the consent banner re-presents as it does for a new visitor.
 */
export const clearAnalyticsConsent = () => {
  localStorage.removeItem(ANALYTICS_CONSENT_STORAGE_KEY);
  notifyAnalyticsConsentListeners(null);
};

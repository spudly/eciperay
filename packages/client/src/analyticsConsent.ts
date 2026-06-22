export const ANALYTICS_CONSENT_STORAGE_KEY = 'eciperay.analyticsConsent';

export type AnalyticsConsentStatus = 'accepted' | 'declined';

export const readAnalyticsConsent = (): AnalyticsConsentStatus | null => {
  const value = localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
  if (value === 'accepted' || value === 'declined') {
    return value;
  }
  return null;
};

export const writeAnalyticsConsent = (status: AnalyticsConsentStatus) => {
  localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, status);
};

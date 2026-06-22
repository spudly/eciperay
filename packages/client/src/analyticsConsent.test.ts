import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from './analyticsConsent.js';

describe('analyticsConsent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('reads and writes consent status', () => {
    expect(readAnalyticsConsent()).toBeNull();
    writeAnalyticsConsent('accepted');
    expect(localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)).toBe(
      'accepted',
    );
    expect(readAnalyticsConsent()).toBe('accepted');
    writeAnalyticsConsent('declined');
    expect(readAnalyticsConsent()).toBe('declined');
  });

  test('ignores unknown stored values', () => {
    localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, 'maybe');
    expect(readAnalyticsConsent()).toBeNull();
  });
});

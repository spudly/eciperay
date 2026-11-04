import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  clearAnalyticsConsent,
  readAnalyticsConsent,
  subscribeAnalyticsConsent,
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

  test('clearing consent returns to the undecided state', () => {
    writeAnalyticsConsent('accepted');
    clearAnalyticsConsent();
    expect(localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)).toBeNull();
    expect(readAnalyticsConsent()).toBeNull();
  });

  test('notifies subscribers of write and clear transitions', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeAnalyticsConsent(listener);
    writeAnalyticsConsent('accepted');
    writeAnalyticsConsent('declined');
    clearAnalyticsConsent();
    expect(listener.mock.calls).toEqual([['accepted'], ['declined'], [null]]);
    unsubscribe();
    writeAnalyticsConsent('accepted');
    expect(listener).toHaveBeenCalledTimes(3);
  });
});

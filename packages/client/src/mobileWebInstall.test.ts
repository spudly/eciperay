import {ANDROID_PLAY_STORE_URL, IOS_APP_STORE_URL} from './legalUrls.js';
import {
  getPrimaryMobileAppStoreUrl,
  isMobileAppInstallDismissed,
  isMobileUserAgent,
  isMobileWebBrowser,
  isStandaloneWebApp,
  MOBILE_APP_INSTALL_DISMISSAL_KEY,
  MOBILE_APP_INSTALL_DISMISSAL_MS,
  MOBILE_WEB_INSTALL_BANNER_MESSAGE,
  readMobileAppInstallDismissedUntil,
  shouldShowMobileAppInstallPrompt,
  writeMobileAppInstallDismissal,
} from './mobileWebInstall.js';

describe('mobileWebInstall', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('detects mobile browsers but not installed PWAs', () => {
    const iphoneUa =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
    expect(isMobileUserAgent(iphoneUa)).toBe(true);
    expect(
      isMobileWebBrowser(iphoneUa, () => ({matches: false}) as MediaQueryList, {
        standalone: false,
      } as unknown as Navigator),
    ).toBe(true);
    expect(
      isMobileWebBrowser(iphoneUa, () => ({matches: true}) as MediaQueryList, {
        standalone: false,
      } as unknown as Navigator),
    ).toBe(false);
    expect(
      isStandaloneWebApp(() => ({matches: false}) as MediaQueryList, {
        standalone: true,
      } as unknown as Navigator),
    ).toBe(true);
  });

  test('persists dismissal for seven days', () => {
    const now = Date.parse('2024-06-01T00:00:00.000Z');
    writeMobileAppInstallDismissal(now);
    expect(readMobileAppInstallDismissedUntil()).toBe(
      now + MOBILE_APP_INSTALL_DISMISSAL_MS,
    );
    expect(isMobileAppInstallDismissed(now + 1)).toBe(true);
    expect(
      isMobileAppInstallDismissed(now + MOBILE_APP_INSTALL_DISMISSAL_MS),
    ).toBe(false);
    localStorage.setItem(MOBILE_APP_INSTALL_DISMISSAL_KEY, 'invalid');
    expect(readMobileAppInstallDismissedUntil()).toBeNull();
  });

  test('decides when to show the install prompt', () => {
    const androidUa =
      'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/125.0.0.0 Mobile';
    const desktopUa = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)';
    const matchMedia = () => ({matches: false}) as MediaQueryList;
    const nav = {standalone: false} as unknown as Navigator;

    expect(
      isMobileWebBrowser(androidUa, matchMedia, nav) &&
        !isMobileAppInstallDismissed(),
    ).toBe(true);
    expect(isMobileWebBrowser(desktopUa, matchMedia, nav)).toBe(false);

    writeMobileAppInstallDismissal();
    expect(
      isMobileWebBrowser(androidUa, matchMedia, nav) &&
        !isMobileAppInstallDismissed(),
    ).toBe(false);
  });

  test('uses browser defaults when checking the install prompt', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: jest.fn().mockReturnValue({matches: false}),
    });
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/125.0.0.0 Mobile',
    });

    expect(shouldShowMobileAppInstallPrompt()).toBe(true);
  });

  test('selects a primary store URL from the user agent', () => {
    expect(
      getPrimaryMobileAppStoreUrl(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      ),
    ).toBe(IOS_APP_STORE_URL);
    expect(
      getPrimaryMobileAppStoreUrl('Mozilla/5.0 (Linux; Android 14) Mobile'),
    ).toBe(ANDROID_PLAY_STORE_URL);
    expect(
      getPrimaryMobileAppStoreUrl('Mozilla/5.0 (Linux; U; Mobile Safari)'),
    ).toBe(ANDROID_PLAY_STORE_URL);
  });

  test('exports banner copy and storage constants', () => {
    expect(MOBILE_WEB_INSTALL_BANNER_MESSAGE).toContain('Eciperay app');
    expect(MOBILE_APP_INSTALL_DISMISSAL_KEY).toBe(
      'eciperay.mobileAppInstallDismissedUntil',
    );
  });
});

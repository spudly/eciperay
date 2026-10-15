import {ANDROID_PLAY_STORE_URL, IOS_APP_STORE_URL} from './legalUrls.js';

export const MOBILE_APP_INSTALL_DISMISSAL_KEY =
  'eciperay.mobileAppInstallDismissedUntil';

export const MOBILE_APP_INSTALL_DISMISSAL_MS = 7 * 24 * 60 * 60 * 1000;

export const MOBILE_WEB_INSTALL_BANNER_MESSAGE =
  'Get the Eciperay app for a better experience on your phone.';

export const isMobileUserAgent = (userAgent: string) =>
  /Android|iPhone|iPod|iPad|Mobile/i.test(userAgent);

export const isStandaloneWebApp = (
  matchMedia: (query: string) => MediaQueryList,
  nav: Navigator,
) =>
  matchMedia('(display-mode: standalone)').matches ||
  (nav as Navigator & {standalone?: boolean}).standalone === true;

export const isMobileWebBrowser = (
  userAgent: string,
  matchMedia: (query: string) => MediaQueryList,
  nav: Navigator,
) => isMobileUserAgent(userAgent) && !isStandaloneWebApp(matchMedia, nav);

export const readMobileAppInstallDismissedUntil = (): number | null => {
  const raw = localStorage.getItem(MOBILE_APP_INSTALL_DISMISSAL_KEY);
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

export const writeMobileAppInstallDismissal = (now = Date.now()) => {
  localStorage.setItem(
    MOBILE_APP_INSTALL_DISMISSAL_KEY,
    String(now + MOBILE_APP_INSTALL_DISMISSAL_MS),
  );
};

export const isMobileAppInstallDismissed = (now = Date.now()) => {
  const dismissedUntil = readMobileAppInstallDismissedUntil();
  return dismissedUntil !== null && now < dismissedUntil;
};

export const shouldShowMobileAppInstallPrompt = (
  userAgent: string = navigator.userAgent,
  now = Date.now(),
) =>
  isMobileWebBrowser(
    userAgent,
    (query: string) => window.matchMedia(query),
    navigator,
  ) && !isMobileAppInstallDismissed(now);

export const getPrimaryMobileAppStoreUrl = (userAgent: string) => {
  if (/Android/i.test(userAgent)) {
    return ANDROID_PLAY_STORE_URL;
  }
  if (/iPhone|iPod|iPad/i.test(userAgent)) {
    return IOS_APP_STORE_URL;
  }
  return ANDROID_PLAY_STORE_URL;
};

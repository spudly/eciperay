import {
  ANDROID_PLAY_STORE_URL,
  IOS_APP_STORE_URL,
  MOBILE_WEB_INSTALL_BANNER_MESSAGE,
  shouldShowMobileAppInstallPrompt,
  writeMobileAppInstallDismissal,
} from '@eciperay/client';
import {useState} from 'react';

export const MobileAppInstallBanner = () => {
  const [visible, setVisible] = useState(shouldShowMobileAppInstallPrompt);

  if (!visible) {
    return null;
  }

  const dismiss = () => {
    writeMobileAppInstallDismissal();
    setVisible(false);
  };

  return (
    <div
      className="
        border-primary/20 bg-primary/5 border-b px-4 py-2 text-sm text-gray-800
      "
      role="region"
      aria-label="Mobile app install prompt"
    >
      <div
        className="
          mx-auto flex max-w-5xl items-start gap-3
          sm:items-center sm:justify-between
        "
      >
        <p className="flex-1">{MOBILE_WEB_INSTALL_BANNER_MESSAGE}</p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <a
            href={IOS_APP_STORE_URL}
            className="text-primary font-medium underline"
          >
            App Store
          </a>
          <a
            href={ANDROID_PLAY_STORE_URL}
            className="text-primary font-medium underline"
          >
            Google Play
          </a>
          <button
            type="button"
            className="
              rounded-md px-2 py-1 text-xs font-medium text-gray-600
              hover:bg-white/70
            "
            aria-label="Dismiss mobile app install prompt"
            onClick={dismiss}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

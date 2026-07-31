import {
  ANDROID_PLAY_STORE_URL,
  IOS_APP_STORE_URL,
  MOBILE_WEB_INSTALL_BANNER_MESSAGE,
  shouldShowMobileAppInstallPrompt,
  writeMobileAppInstallDismissal,
} from '@eciperay/client';
import {useState} from 'react';

import {FixedActionBanner} from './ui/FixedActionBanner.js';

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
    <FixedActionBanner
      position="top"
      role="region"
      ariaLabel="Mobile app install prompt"
      dismissAriaLabel="Dismiss mobile app install prompt"
      onDismiss={dismiss}
      message={
        <div
          className="
            flex flex-col gap-2
            sm:flex-row sm:items-center sm:justify-between
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
          </div>
        </div>
      }
    />
  );
};

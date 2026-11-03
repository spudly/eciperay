import {
  ANDROID_PLAY_STORE_URL,
  IOS_APP_STORE_URL,
  MOBILE_WEB_INSTALL_BANNER_MESSAGE,
  shouldShowMobileAppInstallPrompt,
  writeMobileAppInstallDismissal,
} from '@eciperay/client';
import {FixedActionBanner, Text, TextLink} from '@spudly/ui';
import {useState} from 'react';
import {XStack} from 'tamagui';

export const MobileAppInstallBanner = () => {
  const [visible, setVisible] = useState(shouldShowMobileAppInstallPrompt);

  if (!visible) {
    return null;
  }

  const dismiss = () => {
    writeMobileAppInstallDismissal();
    setVisible(false);
  };

  // The DS FixedActionBanner (B7 C12, design-system#130) carries the
  // banner's layout and dismiss action; it accepts no container
  // role/label, so the prompt's region semantics stay with the host
  // wrapper — the same web-only ariaLabel/role contract the retired
  // local adapter implemented from @eciperay/client's
  // FixedActionBannerProps. The wrapper also pins the banner to the
  // viewport: the DS bar positions itself absolute
  // (design-system#405), while the retired local banner was
  // position:fixed — this fixed wrapper becomes the bar's containing
  // block and restores the viewport-pinned behavior (and the old
  // zIndex 50) until the DS pins fixed itself.
  return (
    <div
      role="region"
      aria-label="Mobile app install prompt"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        zIndex: 50,
      }}
    >
      <FixedActionBanner
        position="top"
        dismissAriaLabel="Dismiss mobile app install prompt"
        onDismiss={dismiss}
        message={
          <XStack
            flexWrap="wrap"
            alignItems="center"
            gap="$2"
          >
            <Text flex={1}>{MOBILE_WEB_INSTALL_BANNER_MESSAGE}</Text>
            <XStack
              flexShrink={0}
              flexWrap="wrap"
              alignItems="center"
              gap="$2"
            >
              <TextLink href={IOS_APP_STORE_URL}>App Store</TextLink>
              <TextLink href={ANDROID_PLAY_STORE_URL}>Google Play</TextLink>
            </XStack>
          </XStack>
        }
      />
    </div>
  );
};

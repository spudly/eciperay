import {
  ANDROID_PLAY_STORE_URL,
  IOS_APP_STORE_URL,
  MOBILE_WEB_INSTALL_BANNER_MESSAGE,
  shouldShowMobileAppInstallPrompt,
  writeMobileAppInstallDismissal,
} from '@eciperay/client';
import {tokens} from '@spudly/ui';
import {useState} from 'react';
import {Anchor, Button, Text, XStack, YStack} from 'tamagui';

export const MobileAppInstallBanner = () => {
  const [visible, setVisible] = useState(shouldShowMobileAppInstallPrompt);

  if (!visible) {
    return null;
  }

  const dismiss = () => {
    writeMobileAppInstallDismissal();
    setVisible(false);
  };

  // Host re-expression of the former DS FixedActionBanner (the DS
  // InstallBannerView exists but is not exported in @spudly/ui 6.x,
  // and no DS page consumes it): a surface pinned to the top edge,
  // holding an info alert above a wrapping row with the ghost dismiss
  // action. The banner accepts no container role/label, so the
  // prompt's region semantics stay with the host wrapper — the same
  // web-only ariaLabel/role contract the retired local adapter
  // implemented. The wrapper also pins the banner to the viewport
  // with the old zIndex 50.
  return (
    <div
      role="region"
      aria-label="Mobile app install prompt"
      style={{position: 'fixed', left: 0, right: 0, top: 0, zIndex: 50}}
    >
      <YStack
        backgroundColor="$surface"
        borderColor="$borderColor"
        borderWidth={0}
        borderBottomWidth={1}
        padding={tokens.spacing[4]}
        gap={tokens.spacing[3]}
        shadowColor={tokens.shadows.lg.shadowColor}
        shadowOpacity={tokens.shadows.lg.shadowOpacity}
        shadowRadius={tokens.shadows.lg.shadowRadius}
        shadowOffset={{width: 0, height: tokens.shadows.lg.shadowOffset.height}}
      >
        <YStack
          width="100%"
          maxWidth={1024}
          alignSelf="center"
          gap="$3"
        >
          <YStack
            backgroundColor="$primarySubtle"
            borderColor="$primary"
            borderWidth={1}
            borderRadius={tokens.radii.md}
            padding={tokens.spacing[3]}
            gap={tokens.spacing[2]}
          >
            <XStack
              flexWrap="wrap"
              alignItems="center"
              gap="$2"
            >
              <Text
                color="$primaryEmphasis"
                flex={1}
                fontSize={tokens.typography.fontSize.md}
              >
                {MOBILE_WEB_INSTALL_BANNER_MESSAGE}
              </Text>
              <XStack
                flexShrink={0}
                flexWrap="wrap"
                alignItems="center"
                gap="$2"
              >
                <Anchor
                  href={IOS_APP_STORE_URL}
                  color="$link"
                  fontSize={tokens.typography.fontSize.md}
                  fontWeight={tokens.typography.fontWeight.medium}
                  textDecorationLine="underline"
                >
                  App Store
                </Anchor>
                <Anchor
                  href={ANDROID_PLAY_STORE_URL}
                  color="$link"
                  fontSize={tokens.typography.fontSize.md}
                  fontWeight={tokens.typography.fontWeight.medium}
                  textDecorationLine="underline"
                >
                  Google Play
                </Anchor>
              </XStack>
            </XStack>
          </YStack>
          <XStack
            flexWrap="wrap"
            alignItems="center"
            gap="$2"
          >
            <Button
              aria-label="Dismiss mobile app install prompt"
              backgroundColor="transparent"
              borderWidth={0}
              color="$link"
              fontFamily="body"
              fontSize={tokens.typography.fontSize.sm}
              fontWeight={tokens.typography.fontWeight.semibold}
              paddingHorizontal={tokens.spacing[3]}
              paddingVertical={tokens.spacing[2]}
              onPress={dismiss}
            >
              Dismiss
            </Button>
          </XStack>
        </YStack>
      </YStack>
    </div>
  );
};

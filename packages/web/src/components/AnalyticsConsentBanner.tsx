import {
  identifyAnalyticsUser,
  readAnalyticsConsent,
  subscribeAnalyticsConsent,
  useAuth,
  writeAnalyticsConsent,
} from '@eciperay/client';
import {tokens} from '@spudly/ui';
import {useEffect, useState} from 'react';
import {Anchor, Button, Text, XStack, YStack} from 'tamagui';

import {analytics, disablePostHog, enablePostHog} from '../lib/analytics.js';
import {POSTHOG_KEY} from '../lib/env.js';

const shouldPromptForConsent = () =>
  POSTHOG_KEY.length > 0 && readAnalyticsConsent() === null;

export const AnalyticsConsentBanner = () => {
  const {session} = useAuth();
  const [visible, setVisible] = useState(shouldPromptForConsent);

  // A withdraw/reset from another surface (Profile, the consent
  // preferences page) returns this browser to undecided in the same
  // session: re-present the banner without waiting for a reload (#408).
  // An accept/decline elsewhere hides a banner still showing here.
  useEffect(
    () =>
      subscribeAnalyticsConsent(() => {
        setVisible(shouldPromptForConsent());
      }),
    [],
  );

  if (!visible) {
    return null;
  }

  const accept = () => {
    writeAnalyticsConsent('accepted');
    enablePostHog();
    if (session) {
      identifyAnalyticsUser(analytics, session);
    }
    setVisible(false);
  };

  const decline = () => {
    writeAnalyticsConsent('declined');
    disablePostHog();
    setVisible(false);
  };

  // Host re-expression of the former DS FixedActionBanner (the DS
  // ConsentBannerView exists but is not exported in @spudly/ui 6.x, and
  // no DS page consumes it): a surface pinned to the bottom edge,
  // holding an info alert above a wrapping row of actions — secondary
  // first, then primary. The banner accepts no container role/label,
  // so the consent prompt's dialog semantics stay with the host
  // wrapper — the same web-only ariaLabel/role contract the retired
  // local adapter implemented. The wrapper also pins the banner to
  // the viewport with the old zIndex 50.
  return (
    <div
      role="dialog"
      aria-label="Cookie and analytics consent"
      style={{position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50}}
    >
      <YStack
        backgroundColor="$surface"
        borderColor="$borderColor"
        borderWidth={0}
        borderTopWidth={1}
        padding={tokens.spacing[4]}
        gap={tokens.spacing[3]}
        shadowColor={tokens.shadows.lg.shadowColor}
        shadowOpacity={tokens.shadows.lg.shadowOpacity}
        shadowRadius={tokens.shadows.lg.shadowRadius}
        shadowOffset={{
          width: 0,
          height: -tokens.shadows.lg.shadowOffset.height,
        }}
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
              justifyContent="space-between"
              alignItems="flex-start"
              gap={tokens.spacing[2]}
            >
              <Text
                color="$primaryEmphasis"
                flex={1}
                fontSize={tokens.typography.fontSize.md}
              >
                We use cookies and product analytics to improve Eciperay. See
                our{' '}
                <Anchor
                  href="/privacy"
                  color="$link"
                  fontSize={tokens.typography.fontSize.md}
                  fontWeight={tokens.typography.fontWeight.medium}
                  textDecorationLine="underline"
                >
                  Privacy Policy
                </Anchor>{' '}
                for details.
              </Text>
            </XStack>
          </YStack>
          <XStack
            flexWrap="wrap"
            alignItems="center"
            gap="$2"
          >
            <Button
              backgroundColor={tokens.colors.gray.gray3}
              borderColor={tokens.colors.gray.gray10}
              borderWidth={1}
              borderRadius={tokens.radii.md}
              color={tokens.colors.gray.gray10}
              fontFamily="body"
              fontSize={tokens.typography.fontSize.md}
              fontWeight={tokens.typography.fontWeight.semibold}
              paddingHorizontal={tokens.spacing[4]}
              paddingVertical={tokens.spacing[3]}
              onPress={decline}
            >
              Decline
            </Button>
            <Button
              backgroundColor="$primary"
              borderColor="transparent"
              borderWidth={1}
              borderRadius={tokens.radii.md}
              color="$onPrimary"
              fontFamily="body"
              fontSize={tokens.typography.fontSize.md}
              fontWeight={tokens.typography.fontWeight.semibold}
              paddingHorizontal={tokens.spacing[4]}
              paddingVertical={tokens.spacing[3]}
              onPress={accept}
            >
              Accept
            </Button>
          </XStack>
        </YStack>
      </YStack>
    </div>
  );
};

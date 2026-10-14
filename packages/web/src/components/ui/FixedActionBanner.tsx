import type {FixedActionBannerProps} from '@eciperay/client';
import {Button as DSButton} from '@spudly/ui';
import {XStack, YStack, Text} from 'tamagui';

import {PrimaryButton} from './PrimaryButton.js';
import {SecondaryButton} from './SecondaryButton.js';

export const FixedActionBanner = ({
  message,
  primaryAction,
  secondaryAction,
  onDismiss,
  dismissAriaLabel = 'Dismiss',
  position = 'bottom',
  ariaLabel,
  role,
}: FixedActionBannerProps) => (
  <YStack
    position="fixed"
    left={0}
    right={0}
    zIndex={50}
    top={position === 'top' ? 0 : undefined}
    bottom={position === 'bottom' ? 0 : undefined}
    backgroundColor="$surface"
    borderColor="$border"
    borderTopWidth={position === 'bottom' ? 1 : 0}
    borderBottomWidth={position === 'top' ? 1 : 0}
    padding="$4"
    shadowColor="$border"
    shadowRadius={8}
    role={role ?? (ariaLabel ? 'dialog' : 'region')}
    aria-label={ariaLabel}
  >
    <XStack
      maxWidth={1024}
      width="100%"
      marginHorizontal="auto"
      flexDirection="column"
      gap="$3"
    >
      <Text
        flex={1}
        fontSize={14}
        color="$text"
      >
        {message}
      </Text>
      <XStack
        flexShrink={0}
        flexWrap="wrap"
        alignItems="center"
        gap="$2"
      >
        {secondaryAction ? (
          <SecondaryButton
            label={secondaryAction.label}
            onPress={secondaryAction.onPress}
          />
        ) : null}
        {primaryAction ? (
          <PrimaryButton
            label={primaryAction.label}
            onPress={primaryAction.onPress}
          />
        ) : null}
        {onDismiss ? (
          <DSButton
            variant="ghost"
            size="sm"
            aria-label={dismissAriaLabel}
            onPress={onDismiss}
          >
            Dismiss
          </DSButton>
        ) : null}
      </XStack>
    </XStack>
  </YStack>
);

if (import.meta.env.DEV) {
  FixedActionBanner.demo = function FixedActionBannerDemo() {
    return (
      <FixedActionBanner
        message="We use cookies to improve Eciperay."
        primaryAction={{
          label: 'Accept',
          onPress: () => {
            void 0;
          },
        }}
        secondaryAction={{
          label: 'Decline',
          onPress: () => {
            void 0;
          },
        }}
      />
    );
  };
}

import type {FixedActionBannerProps} from '@eciperay/client';
import {ActionBar, Button, InlineAlert} from '@spudly/ui';
import {XStack, YStack} from 'tamagui';

// Note: DS DismissibleBanner couldn't be used directly — its `message` is
// typed `string` (ours is ReactNode) and `onDismiss` is required (ours is
// optional). The pinned bar itself is the DS ActionBar (placement maps to
// the old top/bottom positioning); the message is rendered as a DS
// InlineAlert inside it, with DS Buttons for the actions. Content keeps
// the old centered max-width column.
export const FixedActionBanner = ({
  message,
  primaryAction,
  secondaryAction,
  onDismiss,
  dismissAriaLabel = 'Dismiss',
  position = 'bottom',
}: FixedActionBannerProps) => (
  <ActionBar placement={position}>
    <YStack
      width="100%"
      maxWidth={1024}
      alignSelf="center"
      gap="$3"
    >
      <InlineAlert severity="info">{message}</InlineAlert>
      <XStack
        flexWrap="wrap"
        alignItems="center"
        gap="$2"
      >
        {secondaryAction ? (
          <Button
            variant="secondary"
            onPress={secondaryAction.onPress}
          >
            {secondaryAction.label}
          </Button>
        ) : null}
        {primaryAction ? (
          <Button
            variant="primary"
            onPress={primaryAction.onPress}
          >
            {primaryAction.label}
          </Button>
        ) : null}
        {onDismiss ? (
          <Button
            variant="ghost"
            size="sm"
            accessibilityLabel={dismissAriaLabel}
            onPress={onDismiss}
          >
            Dismiss
          </Button>
        ) : null}
      </XStack>
    </YStack>
  </ActionBar>
);

if (__DEV__) {
  FixedActionBanner.demo = () => (
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
}

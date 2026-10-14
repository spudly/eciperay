import type {FixedActionBannerProps} from '@eciperay/client';
import {Button, InlineAlert} from '@spudly/ui';
import clsx from 'clsx';
import {View} from 'react-native';

// Note: DS DismissibleBanner couldn't be used directly — its `message` is
// typed `string` (ours is ReactNode), `onDismiss` is required (ours is
// optional), and it renders every action as a secondary button with no fixed
// positioning. The message is rendered as a DS InlineAlert instead, with DS
// Buttons for the actions.
export const FixedActionBanner = ({
  message,
  primaryAction,
  secondaryAction,
  onDismiss,
  dismissAriaLabel = 'Dismiss',
  position = 'bottom',
}: FixedActionBannerProps) => (
  <View
    className={clsx(
      'ui-fixed-action-banner absolute inset-x-0 z-50',
      position === 'top'
        ? 'ui-fixed-action-banner-top inset-bs-0'
        : 'ui-fixed-action-banner-bottom inset-be-0',
    )}
  >
    <View className="mx-auto gap-3 p-4 max-inline-5xl">
      <InlineAlert severity="info">{message}</InlineAlert>
      <View className="flex-row flex-wrap items-center gap-2">
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
      </View>
    </View>
  </View>
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

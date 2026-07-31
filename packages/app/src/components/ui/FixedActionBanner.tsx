import type {FixedActionBannerProps} from '@eciperay/client';
import clsx from 'clsx';
import {Pressable, Text, View} from 'react-native';

export const FixedActionBanner = ({
  message,
  primaryAction,
  secondaryAction,
  onDismiss,
  position = 'bottom',
}: FixedActionBannerProps) => (
  <View
    className={clsx(
      'ui-fixed-action-banner absolute inset-x-0 z-50',
      position === 'top'
        ? 'ui-fixed-action-banner-top top-0'
        : 'ui-fixed-action-banner-bottom bottom-0',
    )}
  >
    <View className="mx-auto max-w-5xl gap-3 p-4">
      <Text className="text-sm text-gray-700">{message}</Text>
      <View className="flex-row flex-wrap items-center gap-2">
        {secondaryAction ? (
          <Pressable
            className="rounded-lg border border-gray-300 px-4 py-2"
            onPress={secondaryAction.onPress}
          >
            <Text className="text-sm font-medium text-gray-800">
              {secondaryAction.label}
            </Text>
          </Pressable>
        ) : null}
        {primaryAction ? (
          <Pressable
            className="bg-primary rounded-lg px-4 py-2"
            onPress={primaryAction.onPress}
          >
            <Text className="text-sm font-medium text-white">
              {primaryAction.label}
            </Text>
          </Pressable>
        ) : null}
        {onDismiss ? (
          <Pressable
            accessibilityLabel="Dismiss"
            className="rounded-md px-2 py-1"
            onPress={onDismiss}
          >
            <Text className="text-xs font-medium text-gray-600">Dismiss</Text>
          </Pressable>
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

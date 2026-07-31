import {
  DEFAULT_LOADING_DELAY_MS,
  useDelayedTrue,
  type ScreenLoadingGateProps,
} from '@eciperay/client';
import clsx from 'clsx';
import {ActivityIndicator, View} from 'react-native';
import {useState} from 'react';

import {InfoBanner} from './ui/InfoBanner';
import {PrimaryButton} from './ui/PrimaryButton';

export const ScreenLoadingGate = ({
  pending,
  delayMs = DEFAULT_LOADING_DELAY_MS,
  children,
  backgroundClassName = 'bg-white',
}: ScreenLoadingGateProps) => {
  const showLoading = useDelayedTrue(pending, delayMs);

  if (!pending) {
    return children;
  }

  if (!showLoading) {
    return <View className={clsx('flex-1', backgroundClassName)} />;
  }

  return (
    <View className={clsx('ui-loading-center flex-1', backgroundClassName)}>
      <ActivityIndicator size="large" />
    </View>
  );
};

if (__DEV__) {
  const ScreenLoadingGateDemo = () => {
    const [pending, setPending] = useState(true);

    return (
      <>
        <PrimaryButton
          label={pending ? 'Mark ready' : 'Mark pending'}
          onPress={() => {
            setPending(current => !current);
          }}
        />
        <ScreenLoadingGate pending={pending}>
          <InfoBanner>Loaded content behind the gate.</InfoBanner>
        </ScreenLoadingGate>
      </>
    );
  };

  ScreenLoadingGate.demo = () => <ScreenLoadingGateDemo />;
}

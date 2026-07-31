import {
  DEFAULT_LOADING_DELAY_MS,
  useDelayedTrue,
  type ScreenLoadingGateProps,
} from '@eciperay/client';
import clsx from 'clsx';
import {useState} from 'react';
import {View} from 'react-native';

import {BookLoadingSpinner} from './ui/BookLoadingSpinner';
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
      <BookLoadingSpinner size="lg" />
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

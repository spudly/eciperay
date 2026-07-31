import clsx from 'clsx';
import type {ReactNode} from 'react';
import {ActivityIndicator, View} from 'react-native';

import {
  DEFAULT_LOADING_DELAY_MS,
  useDelayedTrue,
} from '../hooks/useDelayedTrue';

type ScreenLoadingGateProps = {
  pending: boolean;
  delayMs?: number;
  children: ReactNode;
  backgroundClassName?: string;
};

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
    <View
      className={clsx(
        'flex-1 items-center justify-center',
        backgroundClassName,
      )}
    >
      <ActivityIndicator size="large" />
    </View>
  );
};

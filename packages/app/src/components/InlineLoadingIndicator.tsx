import clsx from 'clsx';
import {ActivityIndicator, View} from 'react-native';

import {
  DEFAULT_LOADING_DELAY_MS,
  useDelayedTrue,
} from '../hooks/useDelayedTrue';

type InlineLoadingIndicatorProps = {
  loading: boolean;
  delayMs?: number;
  className?: string;
};

export const InlineLoadingIndicator = ({
  loading,
  delayMs = DEFAULT_LOADING_DELAY_MS,
  className,
}: InlineLoadingIndicatorProps) => {
  const showLoading = useDelayedTrue(loading, delayMs);

  if (!showLoading) {
    return null;
  }

  return (
    <View className={clsx('items-center', className)}>
      <ActivityIndicator />
    </View>
  );
};

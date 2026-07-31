import {
  DEFAULT_LOADING_DELAY_MS,
  useDelayedTrue,
  type InlineLoadingIndicatorProps,
} from '@eciperay/client';
import clsx from 'clsx';
import {useState} from 'react';
import {ActivityIndicator, View} from 'react-native';

import {PrimaryButton} from './ui/PrimaryButton';

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
    <View className={clsx('ui-loading-center', className)}>
      <ActivityIndicator />
    </View>
  );
};

if (__DEV__) {
  const InlineLoadingIndicatorDemo = () => {
    const [loading, setLoading] = useState(true);

    return (
      <>
        <PrimaryButton
          label={loading ? 'Hide spinner' : 'Show spinner'}
          onPress={() => {
            setLoading(current => !current);
          }}
        />
        <InlineLoadingIndicator
          loading={loading}
          className="mt-2"
        />
      </>
    );
  };

  InlineLoadingIndicator.demo = () => <InlineLoadingIndicatorDemo />;
}

import {
  DEFAULT_LOADING_DELAY_MS,
  useDelayedTrue,
  type ScreenLoadingGateProps,
} from '@eciperay/client';
import {useState} from 'react';
import {YStack} from 'tamagui';

import {BookLoadingSpinner} from './ui/BookLoadingSpinner.js';
import {PrimaryButton} from './ui/PrimaryButton.js';
import {InfoBanner} from './ui/InfoBanner.js';

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
    return <YStack minHeight="100%" className={backgroundClassName} />;
  }

  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      minHeight="100%"
      className={backgroundClassName}
    >
      <BookLoadingSpinner size="lg" />
    </YStack>
  );
};

if (import.meta.env.DEV) {
  ScreenLoadingGate.demo = function ScreenLoadingGateDemo() {
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
}

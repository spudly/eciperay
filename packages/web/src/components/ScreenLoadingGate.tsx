import {
  DEFAULT_LOADING_DELAY_MS,
  useDelayedTrue,
  type ScreenLoadingGateProps,
} from '@eciperay/client';
import clsx from 'clsx';
import {useState} from 'react';

import {PrimaryButton} from './ui/PrimaryButton.js';
import {InfoBanner} from './ui/InfoBanner.js';

const LoadingSpinner = () => (
  <div
    className="ui-inline-spinner"
    role="status"
    aria-label="Loading"
  />
);

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
    return <div className={clsx('min-h-full', backgroundClassName)} />;
  }

  return (
    <div className={clsx('ui-loading-center min-h-full', backgroundClassName)}>
      <LoadingSpinner />
    </div>
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

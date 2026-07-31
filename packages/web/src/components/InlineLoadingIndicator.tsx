import {
  DEFAULT_LOADING_DELAY_MS,
  useDelayedTrue,
  type InlineLoadingIndicatorProps,
} from '@eciperay/client';
import clsx from 'clsx';
import {useState} from 'react';

import {BookLoadingSpinner} from './ui/BookLoadingSpinner.js';
import {PrimaryButton} from './ui/PrimaryButton.js';

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
    <div className={clsx('ui-loading-center', className)}>
      <BookLoadingSpinner size="md" />
    </div>
  );
};

if (import.meta.env.DEV) {
  InlineLoadingIndicator.demo = function InlineLoadingIndicatorDemo() {
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
}

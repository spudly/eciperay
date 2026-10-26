import {
  DEFAULT_LOADING_DELAY_MS,
  useDelayedTrue,
  type InlineLoadingIndicatorProps,
} from '@eciperay/client';
import {useState} from 'react';
import {YStack} from 'tamagui';

import {BookLoadingSpinner} from './ui/BookLoadingSpinner.js';
import {PrimaryButton} from './ui/PrimaryButton.js';

// Parity note (B6, design-system#129): the app mirror's showcase demo now
// renders the design system Button directly (the app ui/PrimaryButton
// adapter was deleted); this web mirror still uses its own PrimaryButton
// adapter, so no web change was needed.
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
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      className={className}
    >
      <BookLoadingSpinner size="md" />
    </YStack>
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
          className="mbs-2"
        />
      </>
    );
  };
}

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
// Parity note (design-system#129): the app mirror's showcase demo was
// removed with the in-app component showcase; this web mirror keeps its
// own demo for the web showcase page, so no web change was needed.
// The legacy `className` prop remains in the prop type (from
// @eciperay/client) for API compatibility but is no longer applied (B7
// C12, design-system#130 — the same treatment the app mirror shipped);
// callers that need offset wrap the indicator in a margin container
// instead, as the demo below does.
export const InlineLoadingIndicator = ({
  loading,
  delayMs = DEFAULT_LOADING_DELAY_MS,
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
        <YStack marginTop="$2">
          <InlineLoadingIndicator loading={loading} />
        </YStack>
      </>
    );
  };
}

import {
  DEFAULT_LOADING_DELAY_MS,
  useDelayedTrue,
  type InlineLoadingIndicatorProps,
} from '@eciperay/client';
import {tokens} from '@spudly/ui';
import {useState} from 'react';
import {Button, YStack} from 'tamagui';

import {BookLoadingSpinner} from './BookLoadingSpinner.js';

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
        <Button
          backgroundColor="$primary"
          color="$onPrimary"
          borderColor="transparent"
          borderWidth={1}
          borderRadius={tokens.radii.md}
          fontSize={tokens.typography.fontSize.md}
          fontWeight={tokens.typography.fontWeight.semibold}
          paddingHorizontal={tokens.spacing[4]}
          paddingVertical={tokens.spacing[3]}
          onPress={() => {
            setLoading(current => !current);
          }}
        >
          {loading ? 'Hide spinner' : 'Show spinner'}
        </Button>
        <YStack marginTop="$2">
          <InlineLoadingIndicator loading={loading} />
        </YStack>
      </>
    );
  };
}

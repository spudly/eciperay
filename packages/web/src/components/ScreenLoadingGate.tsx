import {
  DEFAULT_LOADING_DELAY_MS,
  useDelayedTrue,
  type ScreenLoadingGateProps,
} from '@eciperay/client';
import {tokens} from '@spudly/ui';
import {useState} from 'react';
import {Button, Text, YStack} from 'tamagui';

import {BookLoadingSpinner} from './BookLoadingSpinner.js';

// The legacy `backgroundClassName` prop remains in the prop type (from
// @eciperay/client) for API compatibility but is no longer applied (B7
// C12, design-system#130 — the same treatment the app mirror shipped):
// the shell background is the theme's semantic surface, as a Tamagui
// prop instead of a Tailwind class.
export const ScreenLoadingGate = ({
  pending,
  delayMs = DEFAULT_LOADING_DELAY_MS,
  children,
}: ScreenLoadingGateProps) => {
  const showLoading = useDelayedTrue(pending, delayMs);

  if (!pending) {
    return children;
  }

  if (!showLoading) {
    return (
      <YStack
        minHeight="100%"
        backgroundColor="$surface"
      />
    );
  }

  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      minHeight="100%"
      backgroundColor="$surface"
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
            setPending(current => !current);
          }}
        >
          {pending ? 'Mark ready' : 'Mark pending'}
        </Button>
        <ScreenLoadingGate pending={pending}>
          <YStack
            backgroundColor="$primarySubtle"
            borderColor="$primary"
            borderWidth={1}
            borderRadius={tokens.radii.md}
            padding={tokens.spacing[3]}
            gap={tokens.spacing[2]}
          >
            <Text color="$primaryEmphasis">
              Loaded content behind the gate.
            </Text>
          </YStack>
        </ScreenLoadingGate>
      </>
    );
  };
}

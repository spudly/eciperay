import type {ScreenContainerProps} from '@eciperay/client';
import {ScreenContainer as DSScreenContainer, tokens} from '@spudly/ui';
import {ScrollView} from 'tamagui';

import {PageTitle} from './PageTitle';

/**
 * Thin adapter over the DS ScreenContainer.
 *
 * Variant mapping (app variant -> DS variant):
 *
 * - Default/padded/list map straight onto the DS variants of the same name, on
 *   the old gray-50 shell background.
 * - White has no DS variant: it is the flush DS `list` layout on the DS surface
 *   color instead of the old hard-coded white.
 *
 * Scrolling: content variants (default, padded, white) scroll. Android has no
 * page-level scroll to fall back on, so a fixed shell makes any content below
 * the fold unreachable — Profile and the recipe form screens overflow on
 * smaller devices (eciperay#166). The `list` variant stays fixed: its screens
 * embed a FlatList, which provides its own scrolling and must not be nested
 * inside a ScrollView.
 *
 * The scroll wrapper is composed here rather than using the DS container's own
 * scrollable mode because the DS ScrollView accepts no ScrollView props: form
 * screens need `keyboardShouldPersistTaps="handled"` on the actual ScrollView,
 * or a tap on a button next to a focused input (e.g. Tags' Add button)
 * dismisses the keyboard instead of pressing the button. The geometry matches
 * the DS scrollable mode (flex:1 ScrollView around the same content stack,
 * which carries flex:1 / minHeight:100%).
 */
export const ScreenContainer = ({
  children,
  variant = 'default',
}: ScreenContainerProps) => {
  if (variant === 'list') {
    return (
      <DSScreenContainer
        scrollable={false}
        variant="list"
        backgroundColor={tokens.colors.gray.gray1}
      >
        {children}
      </DSScreenContainer>
    );
  }
  return (
    <ScrollView
      flex={1}
      keyboardShouldPersistTaps="handled"
    >
      {variant === 'white' ? (
        <DSScreenContainer
          scrollable={false}
          variant="list"
          backgroundColor="$surface"
        >
          {children}
        </DSScreenContainer>
      ) : (
        <DSScreenContainer
          scrollable={false}
          variant={variant}
          backgroundColor={tokens.colors.gray.gray1}
        >
          {children}
        </DSScreenContainer>
      )}
    </ScrollView>
  );
};

if (__DEV__) {
  ScreenContainer.demo = () => (
    <ScreenContainer variant="padded">
      <PageTitle spacing="section">Screen container</PageTitle>
    </ScreenContainer>
  );
}

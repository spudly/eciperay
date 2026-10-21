import type {ScreenContainerProps} from '@eciperay/client';
import {ScreenContainer as DSScreenContainer, tokens} from '@spudly/ui';

import {PageTitle} from './PageTitle.js';

/**
 * Web mirror of the app ScreenContainer adapter. The app adapter scrolls its
 * content variants (Android has no page-level scroll; see eciperay#166) —
 * composing its own ScrollView with keyboardShouldPersistTaps="handled" around
 * the DS content stack, because the DS ScrollView accepts no ScrollView props —
 * while the `list` variant stays fixed around its FlatList. On web the document
 * already scrolls and taps are native browser behavior, so every variant
 * renders non-scrollable here and the page flow provides the scrolling.
 */
export const ScreenContainer = ({
  children,
  variant = 'default',
}: ScreenContainerProps) => (
  // On web the body already scrolls; the Tamagui ScrollView wrapper is redundant.
  <DSScreenContainer
    scrollable={false}
    backgroundColor={
      variant === 'list'
        ? tokens.colors.gray.gray2
        : variant === 'white'
          ? '#ffffff'
          : undefined
    }
  >
    {children}
  </DSScreenContainer>
);

if (import.meta.env.DEV) {
  ScreenContainer.demo = function ScreenContainerDemo() {
    return (
      <ScreenContainer variant="padded">
        <PageTitle spacing="section">Screen container</PageTitle>
      </ScreenContainer>
    );
  };
}

import type {ScreenContainerProps} from '@eciperay/client';
import {ScreenContainer as DSScreenContainer, tokens} from '@spudly/ui';

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
 */
export const ScreenContainer = ({
  children,
  variant = 'default',
}: ScreenContainerProps) => {
  if (variant === 'white') {
    return (
      <DSScreenContainer
        variant="list"
        backgroundColor="$surface"
      >
        {children}
      </DSScreenContainer>
    );
  }
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
    <DSScreenContainer
      variant={variant}
      backgroundColor={tokens.colors.gray.gray1}
    >
      {children}
    </DSScreenContainer>
  );
};

if (__DEV__) {
  ScreenContainer.demo = () => (
    <ScreenContainer variant="padded">
      <PageTitle spacing="section">Screen container</PageTitle>
    </ScreenContainer>
  );
}

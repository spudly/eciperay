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
 * All variants are non-scrollable: screens that scroll use ScreenScroll.
 */
export const ScreenContainer = ({
  children,
  variant = 'default',
}: ScreenContainerProps) => {
  if (variant === 'white') {
    return (
      <DSScreenContainer
        scrollable={false}
        variant="list"
        backgroundColor="$surface"
      >
        {children}
      </DSScreenContainer>
    );
  }
  return (
    <DSScreenContainer
      scrollable={false}
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

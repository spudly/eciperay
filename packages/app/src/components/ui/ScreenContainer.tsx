import type {ScreenContainerProps} from '@eciperay/client';
import {ScreenContainer as DSScreenContainer, tokens} from '@spudly/ui';

import {PageTitle} from './PageTitle';

/**
 * Thin adapter over the DS ScreenContainer.
 *
 * Variant mapping:
 * - default/padded keep the DS page padding (padded uses the wider spacing
 *   of the old ui-screen-shell-padded) on the old gray-50 shell background.
 * - list/white drop the container padding (callers provide their own, e.g.
 *   a FlatList content style) and only tweak the background.
 *
 * All variants are non-scrollable: screens that scroll use ScreenScroll.
 */
export const ScreenContainer = ({
  children,
  variant = 'default',
}: ScreenContainerProps) => {
  if (variant === 'list') {
    return (
      <DSScreenContainer
        scrollable={false}
        paddingHorizontal={0}
        paddingVertical={0}
        backgroundColor={tokens.colors.gray.gray1}
      >
        {children}
      </DSScreenContainer>
    );
  }
  if (variant === 'white') {
    return (
      <DSScreenContainer
        scrollable={false}
        paddingHorizontal={0}
        paddingVertical={0}
        backgroundColor="#ffffff"
      >
        {children}
      </DSScreenContainer>
    );
  }
  if (variant === 'padded') {
    return (
      <DSScreenContainer
        scrollable={false}
        paddingHorizontal={tokens.spacing[6]}
        paddingTop={tokens.spacing[8]}
        backgroundColor={tokens.colors.gray.gray1}
      >
        {children}
      </DSScreenContainer>
    );
  }
  return (
    <DSScreenContainer
      scrollable={false}
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

import type {ScreenScrollProps} from '@eciperay/client';
import {ScreenContainer as DSScreenContainer, tokens} from '@spudly/ui';

import {InfoBanner} from './InfoBanner';

/**
 * Thin adapter over the DS ScreenContainer in its default scrollable mode.
 * The DS default page padding matches the old ui-screen-shell spacing.
 */
export const ScreenScroll = ({children}: ScreenScrollProps) => (
  <DSScreenContainer backgroundColor={tokens.colors.gray.gray1}>
    {children}
  </DSScreenContainer>
);

if (__DEV__) {
  ScreenScroll.demo = () => (
    <ScreenScroll>
      <InfoBanner>Scroll container with sample content.</InfoBanner>
    </ScreenScroll>
  );
}

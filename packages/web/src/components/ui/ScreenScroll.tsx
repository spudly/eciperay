import type {ScreenScrollProps} from '@eciperay/client';
import {ScreenContainer as DSScreenContainer} from '@spudly/ui';

import {InfoBanner} from './InfoBanner.js';

export const ScreenScroll = ({children}: ScreenScrollProps) => (
  // On web the body already scrolls; the Tamagui ScrollView wrapper is redundant.
  <DSScreenContainer scrollable={false}>{children}</DSScreenContainer>
);

if (import.meta.env.DEV) {
  ScreenScroll.demo = function ScreenScrollDemo() {
    return (
      <ScreenScroll>
        <InfoBanner>Scroll container with sample content.</InfoBanner>
      </ScreenScroll>
    );
  };
}

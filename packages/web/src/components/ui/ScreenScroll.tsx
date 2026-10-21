import type {ScreenScrollProps} from '@eciperay/client';
import {ScreenContainer as DSScreenContainer} from '@spudly/ui';

import {InfoBanner} from './InfoBanner.js';

/**
 * Web mirror of the app ScreenScroll adapter. The app adapter composes its own
 * ScrollView so it can set keyboardShouldPersistTaps="handled" for form
 * screens; on web the document scrolls and taps are native browser behavior, so
 * the content renders in the non-scrollable DS container here.
 */
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

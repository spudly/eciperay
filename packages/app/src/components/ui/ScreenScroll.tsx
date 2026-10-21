import type {ScreenScrollProps} from '@eciperay/client';
import {ScreenContainer as DSScreenContainer, tokens} from '@spudly/ui';
import {ScrollView} from 'tamagui';

import {InfoBanner} from './InfoBanner';

/**
 * Scrollable page shell: the DS ScreenContainer's content stack inside an
 * app-owned ScrollView. The wrapper is composed here (rather than using the DS
 * container's scrollable mode) so the ScrollView can carry
 * `keyboardShouldPersistTaps="handled"` — the DS ScrollView accepts no
 * ScrollView props, and form screens (e.g. Edit Version) need taps on buttons
 * next to focused inputs to register instead of only dismissing the keyboard.
 * Geometry matches the DS scrollable mode.
 */
export const ScreenScroll = ({children}: ScreenScrollProps) => (
  <ScrollView
    flex={1}
    keyboardShouldPersistTaps="handled"
  >
    <DSScreenContainer
      scrollable={false}
      backgroundColor={tokens.colors.gray.gray1}
    >
      {children}
    </DSScreenContainer>
  </ScrollView>
);

if (__DEV__) {
  ScreenScroll.demo = () => (
    <ScreenScroll>
      <InfoBanner>Scroll container with sample content.</InfoBanner>
    </ScreenScroll>
  );
}

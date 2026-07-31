import type {ScreenScrollProps} from '@eciperay/client';
import {ScrollView} from 'react-native';

import {InfoBanner} from './InfoBanner';

export const ScreenScroll = ({children}: ScreenScrollProps) => (
  <ScrollView className="ui-screen-shell">{children}</ScrollView>
);

if (__DEV__) {
  ScreenScroll.demo = () => (
    <ScreenScroll>
      <InfoBanner>Scroll container with sample content.</InfoBanner>
    </ScreenScroll>
  );
}

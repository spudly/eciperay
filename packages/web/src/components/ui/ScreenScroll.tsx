import type {ScreenScrollProps} from '@eciperay/client';

import {InfoBanner} from './InfoBanner.js';

export const ScreenScroll = ({children}: ScreenScrollProps) => (
  <div className="ui-screen-shell">{children}</div>
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

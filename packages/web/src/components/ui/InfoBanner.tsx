import type {InfoBannerProps} from '@eciperay/client';
import {Alert as DSAlert} from '@spudly/ui';

// Parity note (design-system#129): the app mirror's showcase demo was
// removed with the in-app component showcase; this web mirror keeps its
// own demo for the web showcase page, so no web change was needed.
// The design system retired InlineAlert in favor of Alert
// (@spudly/ui 1.15.0); the banner is the info-severity Alert.
export const InfoBanner = ({children}: InfoBannerProps) => (
  <DSAlert severity="info">{children}</DSAlert>
);

if (import.meta.env.DEV) {
  InfoBanner.demo = function InfoBannerDemo() {
    return <InfoBanner>Draft based on imported version.</InfoBanner>;
  };
}

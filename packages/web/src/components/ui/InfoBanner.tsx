import type {InfoBannerProps} from '@eciperay/client';
import {InlineAlert as DSInlineAlert} from '@spudly/ui';

// Parity note (design-system#129): the app mirror's showcase demo was
// removed with the in-app component showcase; this web mirror keeps its
// own demo for the web showcase page, so no web change was needed.
export const InfoBanner = ({children}: InfoBannerProps) => (
  <DSInlineAlert severity="info">{children}</DSInlineAlert>
);

if (import.meta.env.DEV) {
  InfoBanner.demo = function InfoBannerDemo() {
    return <InfoBanner>Draft based on imported version.</InfoBanner>;
  };
}

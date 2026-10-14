import type {InfoBannerProps} from '@eciperay/client';
import {InlineAlert as DSInlineAlert} from '@spudly/ui';

export const InfoBanner = ({children}: InfoBannerProps) => (
  <DSInlineAlert severity="info">{children}</DSInlineAlert>
);

if (import.meta.env.DEV) {
  InfoBanner.demo = function InfoBannerDemo() {
    return <InfoBanner>Draft based on imported version.</InfoBanner>;
  };
}

import type {InfoBannerProps} from '@eciperay/client';

export const InfoBanner = ({children}: InfoBannerProps) => (
  <p className="ui-info-banner mb-4">{children}</p>
);

if (import.meta.env.DEV) {
  InfoBanner.demo = function InfoBannerDemo() {
    return <InfoBanner>Draft based on imported version.</InfoBanner>;
  };
}

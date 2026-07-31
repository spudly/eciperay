import type {InfoBannerProps} from '@eciperay/client';
import {Text} from 'react-native';

export const InfoBanner = ({children}: InfoBannerProps) => (
  <Text className="ui-info-banner mb-4">{children}</Text>
);

if (__DEV__) {
  InfoBanner.demo = () => (
    <InfoBanner>Draft based on imported version.</InfoBanner>
  );
}

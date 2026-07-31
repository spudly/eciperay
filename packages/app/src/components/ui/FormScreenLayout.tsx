import type {FormScreenLayoutProps} from '@eciperay/client';
import {Text, View} from 'react-native';

import {PageTitle} from './PageTitle';
import {InfoBanner} from './InfoBanner';

export const FormScreenLayout = ({
  title,
  description,
  children,
}: FormScreenLayoutProps) => (
  <View className="ui-screen-shell">
    <PageTitle>{title}</PageTitle>
    {description ? (
      <Text className="text-muted mb-6 text-sm">{description}</Text>
    ) : null}
    {children}
  </View>
);

if (__DEV__) {
  FormScreenLayout.demo = () => (
    <FormScreenLayout
      title="Form layout"
      description="Shared form screen chrome."
    >
      <InfoBanner>Form body goes here.</InfoBanner>
    </FormScreenLayout>
  );
}

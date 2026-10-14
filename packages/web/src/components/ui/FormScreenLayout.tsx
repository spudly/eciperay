import type {FormScreenLayoutProps} from '@eciperay/client';
import {ScreenContainer as DSScreenContainer, Text as DSText} from '@spudly/ui';

import {PageTitle} from './PageTitle.js';
import {InfoBanner} from './InfoBanner.js';

export const FormScreenLayout = ({
  title,
  description,
  children,
}: FormScreenLayoutProps) => (
  // On web the body already scrolls; the Tamagui ScrollView wrapper is redundant.
  <DSScreenContainer scrollable={false}>
    <PageTitle>{title}</PageTitle>
    {description ? <DSText variant="hint">{description}</DSText> : null}
    {children}
  </DSScreenContainer>
);

if (import.meta.env.DEV) {
  FormScreenLayout.demo = function FormScreenLayoutDemo() {
    return (
      <FormScreenLayout
        title="Form layout"
        description="Shared form screen chrome."
      >
        <InfoBanner>Form body goes here.</InfoBanner>
      </FormScreenLayout>
    );
  };
}

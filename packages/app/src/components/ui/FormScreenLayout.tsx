import type {FormScreenLayoutProps} from '@eciperay/client';
import {FormScreenLayout as DSFormScreenLayout, Text as DSText} from '@spudly/ui';

import {PageTitle} from './PageTitle';
import {InfoBanner} from './InfoBanner';

/**
 * Thin adapter over the DS FormScreenLayout.
 * The DS component only takes children, so title/description are composed
 * on top with the local PageTitle adapter and DS hint text.
 */
export const FormScreenLayout = ({
  title,
  description,
  children,
}: FormScreenLayoutProps) => (
  <DSFormScreenLayout>
    <PageTitle>{title}</PageTitle>
    {description ? <DSText variant="hint">{description}</DSText> : null}
    {children}
  </DSFormScreenLayout>
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

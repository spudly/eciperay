import type {FormScreenLayoutProps} from '@eciperay/client';

import {PageTitle} from './PageTitle.js';
import {InfoBanner} from './InfoBanner.js';

export const FormScreenLayout = ({
  title,
  description,
  children,
}: FormScreenLayoutProps) => (
  <div className="ui-screen-shell">
    <PageTitle>{title}</PageTitle>
    {description ? (
      <p className="text-muted mb-6 text-sm">{description}</p>
    ) : null}
    {children}
  </div>
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

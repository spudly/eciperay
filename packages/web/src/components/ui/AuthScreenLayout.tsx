import type {AuthScreenLayoutProps} from '@eciperay/client';
import {FormScreenLayout as DSFormScreenLayout} from '@spudly/ui';

import {PageTitle} from './PageTitle.js';

export const AuthScreenLayout = ({children}: AuthScreenLayoutProps) => (
  <DSFormScreenLayout>{children}</DSFormScreenLayout>
);

if (import.meta.env.DEV) {
  AuthScreenLayout.demo = function AuthScreenLayoutDemo() {
    return (
      <AuthScreenLayout>
        <PageTitle size="auth">Auth layout</PageTitle>
      </AuthScreenLayout>
    );
  };
}

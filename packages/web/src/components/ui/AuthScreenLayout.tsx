import type {AuthScreenLayoutProps} from '@eciperay/client';

import {PageTitle} from './PageTitle.js';

export const AuthScreenLayout = ({children}: AuthScreenLayoutProps) => (
  <div className="pbs-20 max-inline-md mx-auto px-6">{children}</div>
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

import type {AuthScreenLayoutProps} from '@eciperay/client';
import {ScreenContainer as DSScreenContainer} from '@spudly/ui';

import {PageTitle} from './PageTitle';

/**
 * Thin adapter over the DS ScreenContainer. The DS `auth` variant carries the
 * old ui-screen-shell-auth shell: surface background, wide horizontal padding,
 * large top offset.
 */
export const AuthScreenLayout = ({children}: AuthScreenLayoutProps) => (
  <DSScreenContainer
    scrollable={false}
    variant="auth"
  >
    {children}
  </DSScreenContainer>
);

if (__DEV__) {
  AuthScreenLayout.demo = () => (
    <AuthScreenLayout>
      <PageTitle size="auth">Auth layout</PageTitle>
    </AuthScreenLayout>
  );
}

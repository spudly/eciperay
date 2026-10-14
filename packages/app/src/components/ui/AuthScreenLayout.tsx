import type {AuthScreenLayoutProps} from '@eciperay/client';
import {ScreenContainer as DSScreenContainer} from '@spudly/ui';

import {PageTitle} from './PageTitle';

/**
 * Thin adapter over the DS ScreenContainer.
 * Matches the old ui-screen-shell-auth: white background, px-6, pt-20.
 */
export const AuthScreenLayout = ({children}: AuthScreenLayoutProps) => (
  <DSScreenContainer
    scrollable={false}
    backgroundColor="#ffffff"
    paddingHorizontal={24}
    paddingTop={80}
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

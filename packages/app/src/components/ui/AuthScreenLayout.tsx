import type {AuthScreenLayoutProps} from '@eciperay/client';
import {View} from 'react-native';

import {PageTitle} from './PageTitle';

export const AuthScreenLayout = ({children}: AuthScreenLayoutProps) => (
  <View className="ui-screen-shell-auth">{children}</View>
);

if (__DEV__) {
  AuthScreenLayout.demo = () => (
    <AuthScreenLayout>
      <PageTitle size="auth">Auth layout</PageTitle>
    </AuthScreenLayout>
  );
}

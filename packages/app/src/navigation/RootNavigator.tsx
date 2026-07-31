import {useAuth} from '@eciperay/client';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React from 'react';
import {View} from 'react-native';

import {ScreenLoadingGate} from '../components/ScreenLoadingGate';
import {useAuthDeepLink} from '../hooks/useAuthDeepLink';
import {supabase} from '../lib/supabase';
import {ResetPasswordScreen} from '../screens/auth/ResetPasswordScreen';

import {AuthNavigator} from './AuthNavigator';
import {TabNavigator} from './TabNavigator';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const {session, isLoading} = useAuth();
  const {needsPasswordReset, clearPasswordRecovery} = useAuthDeepLink(supabase);

  if (isLoading) {
    return (
      <ScreenLoadingGate pending>
        <View />
      </ScreenLoadingGate>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {session && needsPasswordReset ? (
          <Stack.Screen name="ResetPassword">
            {() => <ResetPasswordScreen onComplete={clearPasswordRecovery} />}
          </Stack.Screen>
        ) : session ? (
          <Stack.Screen
            name="Main"
            component={TabNavigator}
          />
        ) : (
          <Stack.Screen
            name="Auth"
            component={AuthNavigator}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

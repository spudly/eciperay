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
import {linking} from './linking';
import {TabNavigator} from './TabNavigator';
import type {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

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
    <NavigationContainer linking={linking}>
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

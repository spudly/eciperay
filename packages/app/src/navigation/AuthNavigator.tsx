import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {ForgotPasswordScreen} from '../screens/auth/ForgotPasswordScreen';
import {SignInScreen} from '../screens/auth/SignInScreen';
import {SignUpScreen} from '../screens/auth/SignUpScreen';

const Stack = createNativeStackNavigator();

export const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen
      name="SignIn"
      component={SignInScreen}
    />
    <Stack.Screen
      name="SignUp"
      component={SignUpScreen}
    />
    <Stack.Screen
      name="ForgotPassword"
      component={ForgotPasswordScreen}
    />
  </Stack.Navigator>
);

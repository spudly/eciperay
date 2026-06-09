import {useAuth} from '@recipoo/client';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React from 'react';

import {AuthNavigator} from './AuthNavigator';
import {TabNavigator} from './TabNavigator';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const {session, isLoading} = useAuth();
  if (isLoading) {
    return null;
  }
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {session ? (
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

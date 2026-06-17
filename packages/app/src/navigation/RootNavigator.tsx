import {useAuth} from '@eciperay/client';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React from 'react';
import {ActivityIndicator, View} from 'react-native';

import {AuthNavigator} from './AuthNavigator';
import {TabNavigator} from './TabNavigator';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const {session, isLoading} = useAuth();
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
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

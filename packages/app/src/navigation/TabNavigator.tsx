import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {AddScreen} from '../screens/AddScreen';
import {CookingModeScreen} from '../screens/CookingModeScreen';
import {HomeScreen} from '../screens/HomeScreen';
import {ProfileScreen} from '../screens/ProfileScreen';
import {RecipeDetailScreen} from '../screens/RecipeDetailScreen';
import {RecipesScreen} from '../screens/RecipesScreen';

import type {RecipesStackParamList, RootTabParamList} from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const RecipesStack = createNativeStackNavigator<RecipesStackParamList>();

const RecipesStackNavigator = () => (
  <RecipesStack.Navigator>
    <RecipesStack.Screen
      name="RecipesList"
      component={RecipesScreen}
      options={{title: 'Recipes'}}
    />
    <RecipesStack.Screen
      name="RecipeDetail"
      component={RecipeDetailScreen}
      options={{title: ''}}
    />
    <RecipesStack.Screen
      name="CookingMode"
      component={CookingModeScreen}
      options={{headerShown: false, presentation: 'fullScreenModal'}}
    />
  </RecipesStack.Navigator>
);

export const TabNavigator = () => (
  <Tab.Navigator>
    <Tab.Screen
      name="Home"
      component={HomeScreen}
    />
    <Tab.Screen
      name="Recipes"
      component={RecipesStackNavigator}
    />
    <Tab.Screen
      name="Add"
      component={AddScreen}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
    />
  </Tab.Navigator>
);

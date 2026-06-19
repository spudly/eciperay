import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {AddScreen} from '../screens/AddScreen';
import {CookingModeScreen} from '../screens/CookingModeScreen';
import {EditRecipeScreen} from '../screens/EditRecipeScreen';
import {GenerateAiScreen} from '../screens/GenerateAiScreen';
import {HomeScreen} from '../screens/HomeScreen';
import {ImportImageScreen} from '../screens/ImportImageScreen';
import {ImportReviewScreen} from '../screens/ImportReviewScreen';
import {ImportTextScreen} from '../screens/ImportTextScreen';
import {ImportUrlScreen} from '../screens/ImportUrlScreen';
import {ManualEntryScreen} from '../screens/ManualEntryScreen';
import {ProfileScreen} from '../screens/ProfileScreen';
import {RecipeDetailScreen} from '../screens/RecipeDetailScreen';
import {RecipesScreen} from '../screens/RecipesScreen';
import {TagsScreen} from '../screens/TagsScreen';

import type {
  AddStackParamList,
  ProfileStackParamList,
  RecipesStackParamList,
  RootTabParamList,
} from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const RecipesStack = createNativeStackNavigator<RecipesStackParamList>();
const AddStack = createNativeStackNavigator<AddStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

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
    <RecipesStack.Screen
      name="EditRecipe"
      component={EditRecipeScreen}
      options={{title: 'Edit Recipe'}}
    />
  </RecipesStack.Navigator>
);

const AddStackNavigator = () => (
  <AddStack.Navigator>
    <AddStack.Screen
      name="AddScreen"
      component={AddScreen}
      options={{title: 'Add Recipe'}}
    />
    <AddStack.Screen
      name="ManualEntry"
      component={ManualEntryScreen}
      options={{title: 'Manual Entry'}}
    />
    <AddStack.Screen
      name="ImportUrl"
      component={ImportUrlScreen}
      options={{title: 'Import from URL'}}
    />
    <AddStack.Screen
      name="ImportImage"
      component={ImportImageScreen}
      options={{title: 'Import from Image'}}
    />
    <AddStack.Screen
      name="ImportText"
      component={ImportTextScreen}
      options={{title: 'Import from Text'}}
    />
    <AddStack.Screen
      name="GenerateAi"
      component={GenerateAiScreen}
      options={{title: 'Generate with AI'}}
    />
    <AddStack.Screen
      name="ImportReview"
      component={ImportReviewScreen}
      options={{title: 'Review Import'}}
    />
  </AddStack.Navigator>
);

const ProfileStackNavigator = () => (
  <ProfileStack.Navigator>
    <ProfileStack.Screen
      name="ProfileHome"
      component={ProfileScreen}
      options={{title: 'Profile'}}
    />
    <ProfileStack.Screen
      name="Tags"
      component={TagsScreen}
      options={{title: 'Tags'}}
    />
  </ProfileStack.Navigator>
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
      options={{headerShown: false}}
    />
    <Tab.Screen
      name="Add"
      component={AddStackNavigator}
      options={{headerShown: false}}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileStackNavigator}
      options={{headerShown: false}}
    />
  </Tab.Navigator>
);

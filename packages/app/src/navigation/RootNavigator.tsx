import {useAuth} from '@eciperay/client';
import {
  NavigationContainer,
  type LinkingOptions,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React from 'react';
import {View} from 'react-native';

import {ScreenLoadingGate} from '../components/ScreenLoadingGate';
import {useAuthDeepLink} from '../hooks/useAuthDeepLink';
import {APP_LINKING_PREFIX} from '../lib/deepLinks';
import {supabase} from '../lib/supabase';
import {ResetPasswordScreen} from '../screens/auth/ResetPasswordScreen';

import {AuthNavigator} from './AuthNavigator';
import {TabNavigator} from './TabNavigator';
import type {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Deep-link routing for the app's own scheme (see lib/deepLinks): the
 * design-system pages' hrefs open through Linking, and this config maps those
 * URLs back onto the screens — the in-app half of the #248 href contract. Paths
 * mirror the web route table. The auth callback URL (handled by
 * useAuthDeepLink) matches no path here and is ignored by the container. Links
 * into the branch that is not mounted (Main while signed out, Auth while signed
 * in) resolve to nothing, which is safe: each branch's hrefs are only pressable
 * while that branch is on screen.
 */
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [APP_LINKING_PREFIX],
  config: {
    screens: {
      Main: {
        screens: {
          Home: 'home',
          Recipes: {
            screens: {
              RecipesList: 'recipes',
              SharedWithMe: 'shared-with-me',
              RecipeDetail: 'recipes/:recipeId',
              CookingMode: {
                path: 'recipes/:recipeId/cook',
                // The cooking href carries servings as a query
                // param (see lib/deepLinks); the screen's param is
                // a number.
                parse: {servings: (value: string) => Number(value)},
              },
              EditRecipe: 'recipes/:recipeId/edit',
              TweakAi: 'recipes/:recipeId/tweak-ai',
              EditVersion: 'recipes/:recipeId/versions/:versionId/edit',
            },
          },
          Meals: {
            screens: {
              MealsHub: 'meals',
              MealDetail: 'meals/:mealId',
              MealEdit: 'meals/:mealId?/edit',
              MealCookingMode: 'meals/:mealId/cook',
              MealPlanDetail: 'meal-plans/:planId',
              MealPlanEdit: 'meal-plans/:planId?/edit',
              ShoppingList: 'meal-plans/:planId/shopping-list',
            },
          },
          Add: {
            screens: {
              AddScreen: 'add',
              ManualEntry: 'add/manual',
              ImportUrl: 'add/url',
              ImportImage: 'add/image',
              ImportText: 'add/text',
              GenerateAi: 'add/ai',
              ImportReview: 'import/review/:recipeId',
            },
          },
          Profile: {screens: {ProfileHome: 'profile', Tags: 'tags'}},
          Feedback: 'feedback',
        },
      },
      Auth: {
        screens: {
          SignIn: 'login',
          SignUp: 'signup',
          ForgotPassword: 'forgot-password',
        },
      },
      ResetPassword: 'reset-password',
    },
  },
};

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

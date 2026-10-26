/* eslint-disable max-lines -- tab navigator registers multiple nested stacks */
import {tabIcons} from '@eciperay/icons';
import {useFeedbackShortcutEnabled} from '@eciperay/client';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTheme} from 'tamagui';

import {Icon} from '../components/Icon';
import {AddScreen} from '../screens/AddScreen';
import {CookingModeScreen} from '../screens/CookingModeScreen';
import {EditRecipeScreen} from '../screens/EditRecipeScreen';
import {EditVersionScreen} from '../screens/EditVersionScreen';
import {FeedbackScreen} from '../screens/FeedbackScreen';
import {GenerateAiScreen} from '../screens/GenerateAiScreen';
import {HomeScreen} from '../screens/HomeScreen';
import {ImportImageScreen} from '../screens/ImportImageScreen';
import {ImportReviewScreen} from '../screens/ImportReviewScreen';
import {ImportTextScreen} from '../screens/ImportTextScreen';
import {ImportUrlScreen} from '../screens/ImportUrlScreen';
import {ManualEntryScreen} from '../screens/ManualEntryScreen';
import {MealCookingModeScreen} from '../screens/MealCookingModeScreen';
import {MealDetailScreen} from '../screens/MealDetailScreen';
import {MealEditScreen} from '../screens/MealEditScreen';
import {MealPlanDetailScreen} from '../screens/MealPlanDetailScreen';
import {MealPlanEditScreen} from '../screens/MealPlanEditScreen';
import {MealsHubScreen} from '../screens/MealsHubScreen';
import {ProfileScreen} from '../screens/ProfileScreen';
import {ShoppingListScreen} from '../screens/ShoppingListScreen';
import {RecipeDetailScreen} from '../screens/RecipeDetailScreen';
import {RecipesScreen} from '../screens/RecipesScreen';
import {
  SharedWithMeScreen,
  sharedWithMeScreenOptions,
} from '../screens/SharedWithMeScreen';
import {TagsScreen} from '../screens/TagsScreen';
import {TweakAiScreen} from '../screens/TweakAiScreen';
import {POSTHOG_KEY} from '../lib/env';

import type {
  AddStackParamList,
  MealsStackParamList,
  ProfileStackParamList,
  RecipesStackParamList,
  RootTabParamList,
} from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const RecipesStack = createNativeStackNavigator<RecipesStackParamList>();
const MealsStack = createNativeStackNavigator<MealsStackParamList>();
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
      name="SharedWithMe"
      component={SharedWithMeScreen}
      options={sharedWithMeScreenOptions}
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
    <RecipesStack.Screen
      name="TweakAi"
      component={TweakAiScreen}
      options={{title: 'Tweak with AI'}}
    />
    <RecipesStack.Screen
      name="EditVersion"
      component={EditVersionScreen}
      options={{title: 'Edit Draft'}}
    />
  </RecipesStack.Navigator>
);

const MealsStackNavigator = () => (
  <MealsStack.Navigator>
    <MealsStack.Screen
      name="MealsHub"
      component={MealsHubScreen}
      options={{title: 'Meals'}}
    />
    <MealsStack.Screen
      name="MealDetail"
      component={MealDetailScreen}
      options={{title: 'Meal'}}
    />
    <MealsStack.Screen
      name="MealEdit"
      component={MealEditScreen}
      options={{title: 'Edit meal'}}
    />
    <MealsStack.Screen
      name="MealCookingMode"
      component={MealCookingModeScreen}
      options={{headerShown: false, presentation: 'fullScreenModal'}}
    />
    <MealsStack.Screen
      name="MealPlanDetail"
      component={MealPlanDetailScreen}
      options={{title: 'Meal plan'}}
    />
    <MealsStack.Screen
      name="MealPlanEdit"
      component={MealPlanEditScreen}
      options={{title: 'Edit plan'}}
    />
    <MealsStack.Screen
      name="ShoppingList"
      component={ShoppingListScreen}
      options={{title: 'Shopping list'}}
    />
  </MealsStack.Navigator>
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

export const TabNavigator = () => {
  const {enabled: feedbackShortcutEnabled} = useFeedbackShortcutEnabled();
  const showFeedbackTab = feedbackShortcutEnabled && POSTHOG_KEY.length > 0;
  // Tint colors come from the active Tamagui theme (Warm Harvest
  // terracotta primary), not hardcoded hexes — the previous hardcoded
  // indigo was a styling-migration leftover (spudly/eciperay#149).
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarActiveTintColor: theme.primary.get(),
        tabBarInactiveTintColor: theme.textMuted.get(),
        tabBarIcon: ({color, size}) => {
          const iconName =
            route.name in tabIcons ? tabIcons[route.name] : tabIcons.Profile;
          return (
            <Icon
              name={iconName}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
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
        name="Meals"
        component={MealsStackNavigator}
        options={{headerShown: false}}
      />
      <Tab.Screen
        name="Add"
        component={AddStackNavigator}
        options={{headerShown: false}}
      />
      {showFeedbackTab ? (
        <Tab.Screen
          name="Feedback"
          component={FeedbackScreen}
          options={{title: 'Feedback'}}
        />
      ) : null}
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{headerShown: false}}
      />
    </Tab.Navigator>
  );
};

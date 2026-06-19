// Central param list types for all navigators.
// Each screen's component should use NativeStackScreenProps<ParamList, ScreenName>
// or BottomTabScreenProps<ParamList, ScreenName> for its route/navigation props.

import type {NavigatorScreenParams} from '@react-navigation/native';

export type RecipesStackParamList = {
  RecipesList: undefined;
  RecipeDetail: {recipeId: string};
  CookingMode: {recipeId: string; versionId?: string; servings?: number};
  EditRecipe: {recipeId: string};
  TweakAi: {recipeId: string};
  EditVersion: {recipeId: string; versionId: string};
};

export type AddStackParamList = {
  AddScreen: undefined;
  ManualEntry: undefined;
  ImportUrl: undefined;
  ImportImage: undefined;
  ImportText: undefined;
  GenerateAi: undefined;
  ImportReview: {recipeId: string};
};

export type ProfileStackParamList = {ProfileHome: undefined; Tags: undefined};

export type RootTabParamList = {
  Home: undefined;
  Recipes: NavigatorScreenParams<RecipesStackParamList>;
  Add: NavigatorScreenParams<AddStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

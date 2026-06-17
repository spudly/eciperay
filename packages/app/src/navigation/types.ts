// Central param list types for all navigators.
// Each screen's component should use NativeStackScreenProps<ParamList, ScreenName>
// or BottomTabScreenProps<ParamList, ScreenName> for its route/navigation props.

export type RecipesStackParamList = {
  RecipesList: undefined;
  RecipeDetail: {recipeId: string};
  CookingMode: {recipeId: string};
  EditRecipe: {recipeId: string};
};

export type AddStackParamList = {
  AddScreen: undefined;
  ManualEntry: undefined;
  ImportUrl: undefined;
  ImportImage: undefined;
  ImportText: undefined;
  ImportReview: {recipeId: string};
};

export type ProfileStackParamList = {ProfileHome: undefined; Tags: undefined};

export type RootTabParamList = {
  Home: undefined;
  Recipes: undefined;
  Add: undefined;
  Profile: undefined;
};

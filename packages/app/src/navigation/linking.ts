import type {LinkingOptions} from '@react-navigation/native';

import type {RootStackParamList} from './types';

/**
 * Deep-link routing for the app's own scheme (see lib/deepLinks): the
 * design-system pages' hrefs open through Linking, and this config maps those
 * URLs back onto the screens — the in-app half of the #248 href contract. Paths
 * mirror the web route table. The auth callback URL (handled by
 * useAuthDeepLink) matches no path here and is ignored by the container. Links
 * into the branch that is not mounted (Main while signed out, Auth while signed
 * in) resolve to nothing, which is safe: each branch's hrefs are only pressable
 * while that branch is on screen.
 *
 * Both scheme flavors are listed as prefixes (production `com.eciperay`, dev
 * `com.eciperay.dev` — see lib/authDeepLink) so a link minted by either build
 * resolves in this one; the Android manifest delivers both flavors to
 * MainActivity via the `${authDeepLinkScheme}` placeholder (#484).
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['com.eciperay://', 'com.eciperay.dev://'],
  config: {
    screens: {
      Main: {
        screens: {
          Home: 'home',
          Recipes: {
            screens: {
              RecipesList: 'recipes',
              SharedWithMe: 'shared-with-me',
              RecipeDetail: 'recipes/:recipeId/:slug?',
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

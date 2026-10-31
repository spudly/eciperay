import {AUTH_DEEP_LINK_SCHEME} from './authDeepLink';

/**
 * In-app deep links — the native half of the design system's navigation rule
 * (#248, @spudly/ui 1.15.0): DS pages take navigation destinations as hrefs,
 * never press callbacks, and on native a press opens the href verbatim through
 * Linking. So every in-app destination is a scheme-bearing URL under the app's
 * own scheme, and the linking config in RootNavigator routes those URLs back
 * into the navigators. Paths mirror the web app's route table, so a destination
 * reads the same on both platforms; the edit screens' optional-id paths
 * (`meals/:mealId?/edit`) serve both create (no id) and edit (id) from the one
 * registered screen.
 */
const appHref = (path: string): string => `${AUTH_DEEP_LINK_SCHEME}://${path}`;

/** The scheme prefix the navigation linking config listens on. */
export const APP_LINKING_PREFIX = `${AUTH_DEEP_LINK_SCHEME}://`;

export const recipesHref = appHref('recipes');
export const addHref = appHref('add');
export const sharedWithMeHref = appHref('shared-with-me');
export const recipeHref = (recipeId: string) => appHref(`recipes/${recipeId}`);
export const recipeEditHref = (recipeId: string) =>
  appHref(`recipes/${recipeId}/edit`);
export const recipeVersionEditHref = (recipeId: string, versionId: string) =>
  appHref(`recipes/${recipeId}/versions/${versionId}/edit`);
export const recipeTweakAiHref = (recipeId: string) =>
  appHref(`recipes/${recipeId}/tweak-ai`);
/**
 * The cooking-mode destination: the version on display and the current servings
 * ride as query params, which the linking config delivers as route params
 * (servings parsed back to a number) — the same context the old navigate call
 * passed.
 */
export const recipeCookHref = (
  recipeId: string,
  versionId: string,
  servings: number,
) =>
  appHref(
    `recipes/${recipeId}/cook?versionId=${versionId}&servings=${servings}`,
  );
export const mealHref = (mealId: string) => appHref(`meals/${mealId}`);
export const mealEditHref = (mealId?: string) =>
  appHref(mealId ? `meals/${mealId}/edit` : 'meals/edit');
export const mealCookHref = (mealId: string) => appHref(`meals/${mealId}/cook`);
export const mealPlanHref = (planId: string) => appHref(`meal-plans/${planId}`);
export const mealPlanEditHref = (planId?: string) =>
  appHref(planId ? `meal-plans/${planId}/edit` : 'meal-plans/edit');
export const shoppingListHref = (planId: string) =>
  appHref(`meal-plans/${planId}/shopping-list`);
export const profileHref = appHref('profile');
export const tagsHref = appHref('tags');
export const signInHref = appHref('login');
export const signUpHref = appHref('signup');
export const forgotPasswordHref = appHref('forgot-password');

/** The Add stack's destination hrefs, keyed by the menu's options. */
export const addOptionHrefs = {
  manual: appHref('add/manual'),
  url: appHref('add/url'),
  image: appHref('add/image'),
  text: appHref('add/text'),
  ai: appHref('add/ai'),
} as const;

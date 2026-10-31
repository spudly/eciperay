import {AUTH_DEEP_LINK_SCHEME} from './authDeepLink';
import {
  APP_LINKING_PREFIX,
  addHref,
  addOptionHrefs,
  forgotPasswordHref,
  mealCookHref,
  mealEditHref,
  mealHref,
  mealPlanEditHref,
  mealPlanHref,
  profileHref,
  recipeCookHref,
  recipeEditHref,
  recipeHref,
  recipeTweakAiHref,
  recipeVersionEditHref,
  recipesHref,
  sharedWithMeHref,
  shoppingListHref,
  signInHref,
  signUpHref,
  tagsHref,
} from './deepLinks';

const base = `${AUTH_DEEP_LINK_SCHEME}://`;

describe('deepLinks', () => {
  test('the linking prefix is the app scheme', () => {
    expect(APP_LINKING_PREFIX).toBe(base);
  });

  test('top-level destinations mirror the web route table', () => {
    expect(recipesHref).toBe(`${base}recipes`);
    expect(addHref).toBe(`${base}add`);
    expect(sharedWithMeHref).toBe(`${base}shared-with-me`);
    expect(profileHref).toBe(`${base}profile`);
    expect(tagsHref).toBe(`${base}tags`);
    expect(signInHref).toBe(`${base}login`);
    expect(signUpHref).toBe(`${base}signup`);
    expect(forgotPasswordHref).toBe(`${base}forgot-password`);
  });

  test('recipe destinations carry their ids', () => {
    expect(recipeHref('r1')).toBe(`${base}recipes/r1`);
    expect(recipeEditHref('r1')).toBe(`${base}recipes/r1/edit`);
    expect(recipeVersionEditHref('r1', 'v2')).toBe(
      `${base}recipes/r1/versions/v2/edit`,
    );
    expect(recipeTweakAiHref('r1')).toBe(`${base}recipes/r1/tweak-ai`);
  });

  test('the cooking href carries version and servings as query params', () => {
    expect(recipeCookHref('r1', 'v2', 8)).toBe(
      `${base}recipes/r1/cook?versionId=v2&servings=8`,
    );
    expect(mealCookHref('m1')).toBe(`${base}meals/m1/cook`);
  });

  test('meal and plan edit hrefs serve create (no id) and edit (id)', () => {
    expect(mealHref('m1')).toBe(`${base}meals/m1`);
    expect(mealEditHref()).toBe(`${base}meals/edit`);
    expect(mealEditHref('m1')).toBe(`${base}meals/m1/edit`);
    expect(mealPlanHref('p1')).toBe(`${base}meal-plans/p1`);
    expect(mealPlanEditHref()).toBe(`${base}meal-plans/edit`);
    expect(mealPlanEditHref('p1')).toBe(`${base}meal-plans/p1/edit`);
    expect(shoppingListHref('p1')).toBe(`${base}meal-plans/p1/shopping-list`);
  });

  test('add-option hrefs point at the add stack paths', () => {
    expect(addOptionHrefs).toEqual({
      manual: `${base}add/manual`,
      url: `${base}add/url`,
      image: `${base}add/image`,
      text: `${base}add/text`,
      ai: `${base}add/ai`,
    });
  });
});

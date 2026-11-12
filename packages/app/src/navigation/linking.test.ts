import {getStateFromPath} from '@react-navigation/native';

import {
  addHref,
  recipeCookHref,
  recipeEditHref,
  recipeHref,
  recipeTweakAiHref,
  recipesHref,
  sharedWithMeHref,
} from '../lib/deepLinks';

import {linking} from './linking';

type RouteLike = {
  name: string;
  params?: Record<string, unknown>;
  state?: {routes: RouteLike[]};
};

const resolveLeafRoute = (url: string): RouteLike | undefined => {
  const prefix = linking.prefixes.find(candidate => url.startsWith(candidate));
  if (!prefix || !linking.config) {
    return undefined;
  }
  const state = getStateFromPath(url.slice(prefix.length), {
    screens: linking.config.screens,
  });
  let route = state?.routes[0] as unknown as RouteLike | undefined;
  while (route?.state?.routes[0]) {
    route = route.state.routes[0];
  }
  return route;
};

const resolveLeafScreenName = (url: string): string | undefined =>
  resolveLeafRoute(url)?.name;

// The 13 routes attempted in the Android session reported in #484: each
// one must resolve through the linking config to its existing screen.
const attemptedRoutes: [path: string, screen: string][] = [
  ['signup', 'SignUp'],
  ['forgot-password', 'ForgotPassword'],
  ['recipes', 'RecipesList'],
  ['add', 'AddScreen'],
  ['meal-plans/edit', 'MealPlanEdit'],
  ['add/manual', 'ManualEntry'],
  ['tags', 'Tags'],
  ['shared-with-me', 'SharedWithMe'],
  ['add/url', 'ImportUrl'],
  ['add/image', 'ImportImage'],
  ['add/text', 'ImportText'],
  ['add/ai', 'GenerateAi'],
  ['meals/edit', 'MealEdit'],
];

describe('linking', () => {
  test('both scheme flavors are registered prefixes', () => {
    expect(linking.prefixes).toEqual(
      expect.arrayContaining(['com.eciperay://', 'com.eciperay.dev://']),
    );
  });

  test.each(attemptedRoutes)(
    'com.eciperay://%s resolves to the %s screen',
    (path, screen) => {
      expect(resolveLeafScreenName(`com.eciperay://${path}`)).toBe(screen);
    },
  );

  test.each(attemptedRoutes)(
    'com.eciperay.dev://%s resolves to the %s screen',
    (path, screen) => {
      expect(resolveLeafScreenName(`com.eciperay.dev://${path}`)).toBe(screen);
    },
  );

  // The home page's three actions (#490): HomeScreen passes these exact
  // href constants to HomePage, so each one must resolve through the
  // linking config to a mounted screen — a bare path or an unmapped
  // route would leave the tap dead on Android.
  test.each([
    ['browse (recipesHref)', recipesHref, 'RecipesList'],
    ['add (addHref)', addHref, 'AddScreen'],
    ['shared-with-me (sharedWithMeHref)', sharedWithMeHref, 'RecipesList'],
  ])('the home %s href resolves to the %s screen', (_label, href, screen) => {
    expect(resolveLeafScreenName(href)).toBe(screen);
  });

  // A recipe card's href (#491): RecipesListView maps every created
  // row to recipeHref(id), so that URL must resolve to RecipeDetail
  // with the id delivered as its route param, under both schemes.
  test.each(['com.eciperay://', 'com.eciperay.dev://'])(
    'recipeHref under %s resolves to RecipeDetail with the recipeId param',
    prefix => {
      const route = resolveLeafRoute(`${prefix}recipes/recipe-42`);
      expect(route?.name).toBe('RecipeDetail');
      expect(route?.params).toMatchObject({recipeId: 'recipe-42'});
    },
  );

  // #419: the slugged recipeHref resolves to RecipeDetail carrying
  // both params, and the static subroutes still outrank the slug
  // segment (a recipe's cook link must not land on the detail screen
  // with slug 'cook').
  test('the slugged recipeHref resolves to RecipeDetail with id and slug', () => {
    const route = resolveLeafRoute(
      recipeHref({id: 'recipe-42', slug: 'test-recipe'}),
    );
    expect(route?.name).toBe('RecipeDetail');
    expect(route?.params).toMatchObject({
      recipeId: 'recipe-42',
      slug: 'test-recipe',
    });
  });

  test('the cook subroute is not swallowed by the slug segment', () => {
    expect(resolveLeafScreenName('com.eciperay://recipes/recipe-42/cook')).toBe(
      'CookingMode',
    );
  });

  // A recipe whose slug is a reserved action segment: recipeHref
  // disambiguates it (cook → cook-recipe), so the detail destination
  // resolves to RecipeDetail while the action hrefs keep resolving to
  // their own screens.
  test.each([
    ['cook', 'cook-recipe'],
    ['edit', 'edit-recipe'],
    ['tweak-ai', 'tweak-ai-recipe'],
  ])(
    'recipeHref for the reserved slug %s resolves to RecipeDetail',
    (slug, disambiguated) => {
      const route = resolveLeafRoute(recipeHref({id: 'recipe-42', slug}));
      expect(route?.name).toBe('RecipeDetail');
      expect(route?.params).toMatchObject({
        recipeId: 'recipe-42',
        slug: disambiguated,
      });
    },
  );

  test('recipeHref for a recipe titled Cook resolves to RecipeDetail', () => {
    const route = resolveLeafRoute(
      recipeHref({id: 'recipe-42', title: 'Cook'}),
    );
    expect(route?.name).toBe('RecipeDetail');
    expect(route?.params).toMatchObject({
      recipeId: 'recipe-42',
      slug: 'cook-recipe',
    });
  });

  test.each([
    ['cook', recipeCookHref('recipe-42', 'version-1', 4), 'CookingMode'],
    ['edit', recipeEditHref('recipe-42'), 'EditRecipe'],
    ['tweak-ai', recipeTweakAiHref('recipe-42'), 'TweakAi'],
  ])(
    'the %s action href still resolves to its own screen',
    (_label, href, screen) => {
      expect(resolveLeafScreenName(href)).toBe(screen);
    },
  );

  test('the recipeHref constant itself resolves to RecipeDetail with its id', () => {
    const route = resolveLeafRoute(recipeHref('recipe-42'));
    expect(route?.name).toBe('RecipeDetail');
    expect(route?.params).toMatchObject({recipeId: 'recipe-42'});
  });

  test('auth/callback is NOT claimed by the route map (Supabase handles it via useAuthDeepLink)', () => {
    expect(
      resolveLeafScreenName('com.eciperay://auth/callback'),
    ).toBeUndefined();
    expect(
      resolveLeafScreenName('com.eciperay.dev://auth/callback'),
    ).toBeUndefined();
  });
});

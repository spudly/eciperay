import {getStateFromPath} from '@react-navigation/native';

import {linking} from './linking';

type RouteLike = {name: string; state?: {routes: RouteLike[]}};

const resolveLeafScreenName = (url: string): string | undefined => {
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
  return route?.name;
};

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

  test('auth/callback is NOT claimed by the route map (Supabase handles it via useAuthDeepLink)', () => {
    expect(
      resolveLeafScreenName('com.eciperay://auth/callback'),
    ).toBeUndefined();
    expect(
      resolveLeafScreenName('com.eciperay.dev://auth/callback'),
    ).toBeUndefined();
  });
});

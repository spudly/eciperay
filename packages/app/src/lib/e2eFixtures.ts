import type {ApiClient} from '@eciperay/client';
import type {
  NutritionInfo,
  RecipeDetail,
  RecipeVersionSummary,
} from '@eciperay/types';
import type {Session, SupabaseClient, User} from '@supabase/supabase-js';

/**
 * Fixture mode for the Android emulator use-case suite (#183 Phase 2).
 *
 * This module is only reachable when E2E_FIXTURE_MODE is baked into the
 * bundle (see lib/env): lib/supabase and lib/api swap their real clients
 * for the two factories below, so the app boots already signed in as a
 * fixture user and every API call is answered from the in-memory data
 * here. The suite therefore runs with seeded data, no production
 * backend, and no real account. The emulator workflow job is the only
 * build that sets the flag; release and preview builds never do.
 *
 * The routes mirror the paths in @eciperay/client's API modules
 * (recipesApi, versionsApi, cookLogsApi, aiApi, authApi) for the screens
 * the suite exercises: Home, Recipes, Shared with me, and recipe
 * detail. Reads of unlisted GET paths return an empty list so unrelated
 * queries on those screens settle benignly; any other unlisted request
 * (every mutation, and reads of unknown recipe ids) throws, so a flow
 * that reaches for behavior the fixture does not model fails loudly
 * instead of silently passing against fake success.
 */

export const E2E_FIXTURE_USER_ID = 'e2e-fixture-user';

const FIXTURE_CREATED_AT = '2024-01-01T00:00:00.000Z';

const pastaNutrition: NutritionInfo = {
  servings: 4,
  calories: 620,
  proteinG: 24,
  carbsG: 78,
  fatG: 22,
  fiberG: 6,
  sugarG: 9,
  sodiumMg: 540,
  preparedWeightG: 1200,
  disclaimer: 'Fixture estimate for emulator tests.',
  satietyScore: 55,
  status: 'ready',
};

const saladNutrition: NutritionInfo = {
  servings: 2,
  calories: 210,
  proteinG: 6,
  carbsG: 12,
  fatG: 16,
  fiberG: 4,
  sugarG: 5,
  sodiumMg: 180,
  preparedWeightG: 400,
  disclaimer: 'Fixture estimate for emulator tests.',
  satietyScore: 40,
  status: 'ready',
};

const soupNutrition: NutritionInfo = {
  servings: 6,
  calories: 180,
  proteinG: 7,
  carbsG: 24,
  fatG: 6,
  fiberG: 5,
  sugarG: 8,
  sodiumMg: 620,
  preparedWeightG: 1500,
  disclaimer: 'Fixture estimate for emulator tests.',
  satietyScore: 48,
  status: 'ready',
};

type FixtureRecipeSpec = {
  id: string;
  versionId: string;
  slug: string;
  title: string;
  description: string;
  servings: number;
  prepTimeMin: number;
  cookTimeMin: number;
  nutrition: NutritionInfo;
  ingredients: {name: string; quantity: number | null; unit: string | null}[];
  instructions: string[];
};

const buildFixtureRecipe = (spec: FixtureRecipeSpec): RecipeDetail => ({
  id: spec.id,
  userId: E2E_FIXTURE_USER_ID,
  status: 'evolving',
  visibility: 'private',
  slug: spec.slug,
  contentRevision: 1,
  clonedFromRecipeId: null,
  starRating: null,
  versionId: spec.versionId,
  versionNumber: 1,
  title: spec.title,
  description: spec.description,
  servings: spec.servings,
  prepTimeMin: spec.prepTimeMin,
  cookTimeMin: spec.cookTimeMin,
  imageUrl: null,
  sourceUrl: null,
  createdVia: 'manual',
  createdAt: FIXTURE_CREATED_AT,
  updatedAt: FIXTURE_CREATED_AT,
  satietyScore: spec.nutrition.satietyScore,
  nutritionStatus: spec.nutrition.status,
  calories: spec.nutrition.calories,
  proteinG: spec.nutrition.proteinG,
  carbsG: spec.nutrition.carbsG,
  fatG: spec.nutrition.fatG,
  ingredients: spec.ingredients.map((ingredient, index) => ({
    id: `${spec.id}-ingredient-${index + 1}`,
    recipeVersionId: spec.versionId,
    sortOrder: index,
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    notes: null,
    isOptional: false,
  })),
  instructions: spec.instructions.map((body, index) => ({
    id: `${spec.id}-instruction-${index + 1}`,
    recipeVersionId: spec.versionId,
    stepNumber: index + 1,
    body,
    estimatedDurationMin: null,
  })),
  tags: [],
  nutrition: spec.nutrition,
  communityRating: null,
});

/** The signed-in fixture user's own recipes (Recipes list). */
export const E2E_OWN_RECIPES: RecipeDetail[] = [
  buildFixtureRecipe({
    id: 'e2e-recipe-pasta',
    versionId: 'e2e-version-pasta',
    slug: 'e2e-weeknight-pasta',
    title: 'E2E Weeknight Pasta',
    description: 'Fixture pasta for the emulator use-case suite.',
    servings: 4,
    prepTimeMin: 10,
    cookTimeMin: 20,
    nutrition: pastaNutrition,
    ingredients: [
      {name: 'Spaghetti', quantity: 400, unit: 'g'},
      {name: 'Crushed tomatoes', quantity: 400, unit: 'g'},
      {name: 'Garlic', quantity: 3, unit: 'cloves'},
      {name: 'Olive oil', quantity: 2, unit: 'tbsp'},
    ],
    instructions: [
      'Boil the pasta in well-salted water until al dente.',
      'Simmer the sauce for 15 minutes.',
      'Toss the pasta through the sauce and serve.',
    ],
  }),
  buildFixtureRecipe({
    id: 'e2e-recipe-salad',
    versionId: 'e2e-version-salad',
    slug: 'e2e-garden-salad',
    title: 'E2E Garden Salad',
    description: 'Fixture salad for the emulator use-case suite.',
    servings: 2,
    prepTimeMin: 15,
    cookTimeMin: 0,
    nutrition: saladNutrition,
    ingredients: [
      {name: 'Mixed greens', quantity: 150, unit: 'g'},
      {name: 'Cucumber', quantity: 1, unit: null},
      {name: 'Olive oil', quantity: 1, unit: 'tbsp'},
    ],
    instructions: [
      'Chop the vegetables.',
      'Whisk the dressing and toss everything together.',
    ],
  }),
];

/** Recipes another fixture user shared with the fixture user. */
export const E2E_SHARED_RECIPES: RecipeDetail[] = [
  buildFixtureRecipe({
    id: 'e2e-recipe-shared-soup',
    versionId: 'e2e-version-shared-soup',
    slug: 'e2e-shared-tomato-soup',
    title: 'E2E Shared Tomato Soup',
    description: 'Fixture shared recipe for the emulator use-case suite.',
    servings: 6,
    prepTimeMin: 10,
    cookTimeMin: 30,
    nutrition: soupNutrition,
    ingredients: [
      {name: 'Tomatoes', quantity: 800, unit: 'g'},
      {name: 'Onion', quantity: 1, unit: null},
      {name: 'Vegetable stock', quantity: 500, unit: 'ml'},
    ],
    instructions: [
      'Soften the onion in a large pot.',
      'Add the tomatoes and stock, then simmer for 25 minutes.',
      'Blend until smooth and season to taste.',
    ],
  }),
];

const ALL_FIXTURE_RECIPES: RecipeDetail[] = [
  ...E2E_OWN_RECIPES,
  ...E2E_SHARED_RECIPES,
];

const findFixtureRecipe = (id: string): RecipeDetail | undefined =>
  ALL_FIXTURE_RECIPES.find(recipe => recipe.id === id);

const buildVersionSummary = (recipe: RecipeDetail): RecipeVersionSummary => ({
  id: recipe.versionId,
  recipeId: recipe.id,
  versionNumber: recipe.versionNumber,
  title: recipe.title,
  derivedRole: 'active',
  cookLogCount: 0,
  childVersionCount: 0,
  isEditable: true,
  isContentLocked: false,
  createdVia: recipe.createdVia,
  changeSummary: null,
  createdAt: recipe.createdAt,
});

type FixtureApiError = Error & {code?: string; status?: number};

const fixtureError = (
  message: string,
  status: number,
  code: string,
): FixtureApiError => {
  const error: FixtureApiError = new Error(message);
  error.status = status;
  error.code = code;
  return error;
};

const RECIPE_PATH = /^\/recipes\/([^/]+)$/;
const VERSIONS_PATH = /^\/recipes\/([^/]+)\/versions$/;
const COOK_LOGS_PATH = /^\/recipes\/([^/]+)\/versions\/([^/]+)\/cooks$/;
const NUTRITION_PATH = /^\/recipes\/([^/]+)\/ai\/nutrition$/;
const SUBSTITUTIONS_PATH = /^\/recipes\/([^/]+)\/ai\/substitutions$/;

/**
 * An ApiClient (the single-fetch shape from @eciperay/client) backed by
 * the fixture data above. Returned values are the exact payloads the
 * typed API modules expect, so createEciperayClient works unchanged on
 * top of it.
 */
export const createFixtureApiClient = (): ApiClient => {
  const fetchFixture = async <T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> => {
    const method = (options.method ?? 'GET').toUpperCase();
    const pathname = path.split('?')[0];

    if (method === 'POST' && pathname === '/auth/sync') {
      return undefined as unknown as T;
    }

    if (method === 'GET' && pathname === '/recipes') {
      return E2E_OWN_RECIPES as unknown as T;
    }
    if (method === 'GET' && pathname === '/recipes/shared-with-me') {
      return E2E_SHARED_RECIPES as unknown as T;
    }

    const versionsMatch = VERSIONS_PATH.exec(pathname);
    if (method === 'GET' && versionsMatch) {
      const recipe = findFixtureRecipe(versionsMatch[1]);
      if (!recipe) {
        throw fixtureError(
          `Fixture recipe not found: ${path}`,
          404,
          'not_found',
        );
      }
      return [buildVersionSummary(recipe)] as unknown as T;
    }

    if (method === 'GET' && COOK_LOGS_PATH.test(pathname)) {
      return [] as unknown as T;
    }

    const nutritionMatch = NUTRITION_PATH.exec(pathname);
    if (method === 'GET' && nutritionMatch) {
      const recipe = findFixtureRecipe(nutritionMatch[1]);
      if (!recipe) {
        throw fixtureError(
          `Fixture recipe not found: ${path}`,
          404,
          'not_found',
        );
      }
      return recipe.nutrition as unknown as T;
    }

    if (method === 'GET' && SUBSTITUTIONS_PATH.test(pathname)) {
      return [] as unknown as T;
    }

    const recipeMatch = RECIPE_PATH.exec(pathname);
    if (method === 'GET' && recipeMatch) {
      const recipe = findFixtureRecipe(recipeMatch[1]);
      if (!recipe) {
        throw fixtureError(
          `Fixture recipe not found: ${path}`,
          404,
          'not_found',
        );
      }
      // recipes.get is typed RecipeDetail & RecipeRatingSummary.
      return {
        ...recipe,
        viewerRating: null,
        viewerRatingIsStale: false,
      } as unknown as T;
    }

    if (method === 'GET') {
      // Any other read a mounted screen fires (none of the exercised
      // screens need one) settles as an empty list rather than an error
      // state that could bleed into the asserted screens.
      return [] as unknown as T;
    }

    throw fixtureError(
      `E2E fixture mode does not handle ${method} ${path}`,
      501,
      'e2e_fixture_unhandled',
    );
  };

  return {fetch: fetchFixture};
};

export const E2E_FIXTURE_USER: User = {
  id: E2E_FIXTURE_USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'e2e@eciperay.invalid',
  app_metadata: {provider: 'email', providers: ['email']},
  user_metadata: {},
  created_at: FIXTURE_CREATED_AT,
  updated_at: FIXTURE_CREATED_AT,
} as User;

export const E2E_FIXTURE_SESSION: Session = {
  access_token: 'e2e-fixture-access-token',
  refresh_token: 'e2e-fixture-refresh-token',
  expires_in: 3600,
  expires_at: 4102444800,
  token_type: 'bearer',
  user: E2E_FIXTURE_USER,
} as Session;

/**
 * The slice of the Supabase client the app touches before and during
 * the exercised screens: AuthProvider restores the session with
 * getSession and subscribes with onAuthStateChange (which never fires
 * — the fixture session is permanent), api.ts reads the token from
 * getSession, and the auth deep-link hook subscribes the same way.
 * Anything else on the real client is unreachable in fixture mode
 * because the exercised screens talk to the fixture API client, so the
 * stub intentionally implements nothing more.
 */
export const createFixtureSupabaseClient = (): SupabaseClient => {
  const stub = {
    auth: {
      getSession: () =>
        Promise.resolve({data: {session: E2E_FIXTURE_SESSION}, error: null}),
      getUser: () =>
        Promise.resolve({data: {user: E2E_FIXTURE_USER}, error: null}),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            id: 'e2e-fixture-subscription',
            callback: () => undefined,
            unsubscribe: () => undefined,
          },
        },
      }),
      signOut: () => Promise.resolve({error: null}),
    },
  };
  return stub as unknown as SupabaseClient;
};

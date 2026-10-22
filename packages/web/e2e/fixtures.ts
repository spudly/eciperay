/**
 * Self-contained fixtures for the Playwright e2e suite (issue #184).
 *
 * Shapes mirror the production API responses exactly as pinned by the web
 * package's MSW handlers (src/test/msw/handlers.ts) and the @eciperay/types
 * definitions. No test talks to the production API, a real Supabase project, or
 * a real account: Playwright route interception (see mockApi.ts) fulfills every
 * /api/* and Supabase auth request from these fixtures, and the session is a
 * fabricated localStorage entry.
 */

const E2E_USER_ID = 'e2e-user-uuid-1';
const E2E_USER_EMAIL = 'e2e@example.com';

export const VERSION_ID = 'e2e-version-uuid-1';

const baseRecipe = {
  userId: E2E_USER_ID,
  status: 'evolving',
  visibility: 'private',
  contentRevision: 1,
  clonedFromRecipeId: null,
  starRating: null,
  versionId: VERSION_ID,
  versionNumber: 1,
  description: 'An e2e fixture recipe',
  servings: 4,
  prepTimeMin: 10,
  cookTimeMin: 20,
  imageUrl: null,
  sourceUrl: null,
  createdVia: 'manual',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  satietyScore: null,
  nutritionStatus: null,
  calories: null,
  proteinG: null,
  nutrition: null,
  communityRating: null,
  tags: [],
};

export const pastaRecipe = {
  ...baseRecipe,
  id: 'e2e-recipe-pasta',
  slug: 'e2e-tomato-pasta',
  title: 'E2E Tomato Pasta',
  ingredients: [
    {
      id: 'e2e-ing-1',
      recipeVersionId: VERSION_ID,
      sortOrder: 0,
      name: 'Spaghetti',
      quantity: 400,
      unit: 'g',
      notes: null,
      isOptional: false,
    },
    {
      id: 'e2e-ing-2',
      recipeVersionId: VERSION_ID,
      sortOrder: 1,
      name: 'Crushed tomatoes',
      quantity: 1,
      unit: 'can',
      notes: null,
      isOptional: false,
    },
  ],
  instructions: [
    {
      id: 'e2e-ins-1',
      recipeVersionId: VERSION_ID,
      stepNumber: 1,
      body: 'Boil the spaghetti in salted water',
      estimatedDurationMin: null,
    },
    {
      id: 'e2e-ins-2',
      recipeVersionId: VERSION_ID,
      stepNumber: 2,
      body: 'Simmer the tomato sauce and toss together',
      estimatedDurationMin: null,
    },
  ],
};

const soupRecipe = {
  ...baseRecipe,
  id: 'e2e-recipe-soup',
  slug: 'e2e-lentil-soup',
  title: 'E2E Lentil Soup',
  ingredients: [
    {
      id: 'e2e-ing-3',
      recipeVersionId: VERSION_ID,
      sortOrder: 0,
      name: 'Red lentils',
      quantity: 2,
      unit: 'cups',
      notes: null,
      isOptional: false,
    },
  ],
  instructions: [
    {
      id: 'e2e-ins-3',
      recipeVersionId: VERSION_ID,
      stepNumber: 1,
      body: 'Simmer the lentils until tender',
      estimatedDurationMin: null,
    },
  ],
};

export const allRecipes = [pastaRecipe, soupRecipe];

export const sharedRecipe = {
  ...pastaRecipe,
  id: 'e2e-recipe-shared',
  userId: 'e2e-other-user',
  slug: 'e2e-shared-salad',
  title: 'E2E Shared Salad',
  visibility: 'public',
};

export const publicRecipeSummary = {
  id: 'e2e-public-1',
  slug: 'e2e-public-pancakes',
  title: 'E2E Public Pancakes',
  description: 'A public e2e fixture recipe',
  servings: 4,
  prepTimeMin: 5,
  cookTimeMin: 10,
  imageUrl: null,
  visibility: 'public',
  authorDisplayName: 'E2E Chef',
  updatedAt: '2024-01-01T00:00:00.000Z',
  tags: [],
  communityRating: null,
  satietyScore: null,
  nutritionStatus: null,
  calories: null,
  proteinG: null,
};

export const mealPlanFixture = {
  id: 'e2e-plan-1',
  userId: E2E_USER_ID,
  title: 'E2E Week Plan',
  notes: null,
  startsOn: '2026-01-01',
  endsOn: '2026-01-07',
  entryCount: 1,
  nutrition: null,
  goalProgress: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

export const entitlementFixture = {
  plan: 'free',
  status: null,
  aiUsed: 0,
  aiLimit: 25,
  periodEndsAt: null,
  paddleCustomerId: null,
  cancelAtPeriodEnd: false,
};

/** A fabricated Supabase session, stored by mockApi.ts before page load. */
export const fakeSession = {
  access_token: 'e2e-access-token',
  refresh_token: 'e2e-refresh-token',
  expires_in: 3600,
  // Far-future expiry so supabase-js never tries to refresh (which would
  // need a network round-trip to the fake Supabase host).
  expires_at: 4102444800,
  token_type: 'bearer',
  user: {
    id: E2E_USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: E2E_USER_EMAIL,
    email_confirmed_at: '2024-01-01T00:00:00.000Z',
    app_metadata: {provider: 'email', providers: ['email']},
    user_metadata: {},
    identities: [],
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
};

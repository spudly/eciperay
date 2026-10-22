import type {Page} from '@playwright/test';

import {
  allRecipes,
  entitlementFixture,
  fakeSession,
  mealPlanFixture,
  pastaRecipe,
  publicRecipeSummary,
  sharedRecipe,
  VERSION_ID,
} from './fixtures.js';

/**
 * Route interception for the e2e suite (issue #184).
 *
 * The web build under test is configured with a FAKE Supabase project
 * (https://e2e.supabase.co — a host that is never contacted for real because
 * every request to it is intercepted here) and the default relative API base
 * ('/api' on the preview origin). Every backend response comes from
 * fixtures.ts, so the suite is fully self-contained: no production API, no real
 * account, no network.
 */

const SUPABASE_ORIGIN = 'https://e2e.supabase.co';

// supabase-js derives its localStorage key from the first hostname
// label of the project URL: sb-<label>-auth-token.
const SUPABASE_STORAGE_KEY = 'sb-e2e-auth-token';

const json = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

const recipeDetailResponse = (id: string) => {
  const recipe =
    allRecipes.find(r => r.id === id) ??
    (id === sharedRecipe.id ? sharedRecipe : pastaRecipe);
  return {
    ...recipe,
    id,
    communityRating: null,
    viewerRating: null,
    viewerRatingIsStale: false,
  };
};

const versionSummary = {
  id: VERSION_ID,
  recipeId: pastaRecipe.id,
  versionNumber: 1,
  title: pastaRecipe.title,
  derivedRole: 'active',
  cookLogCount: 0,
  childVersionCount: 0,
  isEditable: false,
  isContentLocked: true,
  createdVia: 'manual',
  changeSummary: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

export const installMocks = async (
  page: Page,
  options: {signedIn: boolean},
): Promise<{pageErrors: string[]}> => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => {
    pageErrors.push(String(error));
  });

  if (options.signedIn) {
    await page.addInitScript(
      ({key, session}) => {
        window.localStorage.setItem(key, JSON.stringify(session));
      },
      {key: SUPABASE_STORAGE_KEY, session: fakeSession},
    );
  }

  // Fake Supabase project: answer auth reads from the fabricated
  // session/user; anything else gets an empty success so the client
  // never reaches the network.
  await page.route(`${SUPABASE_ORIGIN}/**`, async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/auth/v1/user')) {
      await route.fulfill(json(fakeSession.user));
      return;
    }
    if (url.pathname.startsWith('/auth/v1/token')) {
      await route.fulfill(json(fakeSession));
      return;
    }
    if (url.pathname.startsWith('/rest/v1/')) {
      await route.fulfill(json([]));
      return;
    }
    await route.fulfill(json({}));
  });

  // Analytics must never phone home from tests.
  await page.route('**/*posthog.com/**', route => route.abort());

  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === '/api/auth/sync' && method === 'POST') {
      await route.fulfill({status: 204, body: ''});
      return;
    }
    if (path === '/api/recipes' && method === 'GET') {
      const search = url.searchParams.get('search')?.trim().toLowerCase();
      const filtered = search
        ? allRecipes.filter(r => r.title.toLowerCase().includes(search))
        : allRecipes;
      const offset = Number(url.searchParams.get('offset') ?? 0);
      const limit = Number(url.searchParams.get('limit') ?? 100);
      await route.fulfill(json(filtered.slice(offset, offset + limit)));
      return;
    }
    if (path === '/api/recipes/shared-with-me' && method === 'GET') {
      await route.fulfill(json([sharedRecipe]));
      return;
    }
    const recipeMatch = /^\/api\/recipes\/([^/]+)$/.exec(path);
    if (recipeMatch && method === 'GET') {
      await route.fulfill(json(recipeDetailResponse(recipeMatch[1]!)));
      return;
    }
    if (/^\/api\/recipes\/[^/]+\/comments$/.test(path)) {
      await route.fulfill(json([]));
      return;
    }
    if (/^\/api\/recipes\/[^/]+\/versions$/.test(path)) {
      await route.fulfill(json([versionSummary]));
      return;
    }
    const versionMatch = /^\/api\/recipes\/([^/]+)\/versions\/([^/]+)$/.exec(
      path,
    );
    if (versionMatch && method === 'GET') {
      const recipe = recipeDetailResponse(versionMatch[1]!);
      await route.fulfill(
        json({
          ...versionSummary,
          recipeId: versionMatch[1],
          status: recipe.status,
          description: recipe.description,
          servings: recipe.servings,
          prepTimeMin: recipe.prepTimeMin,
          cookTimeMin: recipe.cookTimeMin,
          imageUrl: recipe.imageUrl,
          sourceUrl: recipe.sourceUrl,
          derivedFromVersionId: null,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          tags: recipe.tags,
        }),
      );
      return;
    }
    if (/^\/api\/recipes\/[^/]+\/versions\/[^/]+\/cooks$/.test(path)) {
      await route.fulfill(json([]));
      return;
    }
    if (path === '/api/public/recipes' && method === 'GET') {
      const search = url.searchParams.get('search')?.trim().toLowerCase();
      const items =
        search && !publicRecipeSummary.title.toLowerCase().includes(search)
          ? []
          : [publicRecipeSummary];
      await route.fulfill(json(items));
      return;
    }
    const publicMatch = /^\/api\/public\/recipes\/([^/]+)(\/[^/]+)?$/.exec(
      path,
    );
    if (publicMatch && method === 'GET') {
      const {userId: _userId, ...publicRecipe} = pastaRecipe;
      await route.fulfill(
        json({
          recipe: {...publicRecipe, id: publicMatch[1], visibility: 'public'},
          canonicalSlug: pastaRecipe.slug,
          communityRating: null,
          viewerRating: null,
          viewerRatingIsStale: false,
        }),
      );
      return;
    }
    if (path === '/api/tags') {
      await route.fulfill(json([]));
      return;
    }
    if (path === '/api/meals') {
      await route.fulfill(json([]));
      return;
    }
    if (path === '/api/meal-plans' && method === 'GET') {
      await route.fulfill(json([mealPlanFixture]));
      return;
    }
    const planMatch = /^\/api\/meal-plans\/([^/]+)$/.exec(path);
    if (planMatch && method === 'GET') {
      await route.fulfill(json({...mealPlanFixture, entries: []}));
      return;
    }
    if (path === '/api/account/entitlement') {
      await route.fulfill(json(entitlementFixture));
      return;
    }
    if (path === '/api/account/nutrition-goals') {
      await route.fulfill(
        json({
          calories: null,
          proteinG: null,
          carbsG: null,
          fatG: null,
          satietyScore: null,
        }),
      );
      return;
    }
    if (path === '/api/account/personal-access-tokens') {
      await route.fulfill(json([]));
      return;
    }

    // Anything unmocked is a suite bug or a new backend call the suite
    // must learn about: fail loudly in the server log and answer 404 so
    // the page under test cannot silently depend on a real service.
    console.warn(`[e2e] unmocked API request: ${method} ${path}`);
    await route.fulfill(json({error: 'e2e-unmocked'}, 404));
  });

  return {pageErrors};
};

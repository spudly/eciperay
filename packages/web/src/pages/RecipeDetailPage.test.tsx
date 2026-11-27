import {buildRecipePageTitle, queryKeys} from '@eciperay/client';
import * as ReactQuery from '@tanstack/react-query';
import {vi} from 'vitest';
import {act, fireEvent, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {Route, Routes, useLocation} from 'react-router-dom';

import {
  makeRecipeDetail,
  makeRecipeVersionDetail,
  makeRecipeVersionSummary,
} from '../test/fixtures/recipe.js';
import {server} from '../test/msw/server.js';
import {makeQueryClient, renderWithProviders} from '../test/testUtils.js';

import {RecipeDetailPage} from './RecipeDetailPage.js';

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

const renderDetailAt = async (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route
          path="/recipes/:recipeId"
          element={<RecipeDetailPage />}
        />
        <Route
          path="/recipes/:recipeId/:slug"
          element={<RecipeDetailPage />}
        />
      </Routes>
      <LocationProbe />
    </>,
    {route},
  );

describe('RecipeDetailPage', () => {
  test('renders every section in a single scroll', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/recipes/:recipeId"
          element={<RecipeDetailPage />}
        />
        <Route
          path="/recipes/:recipeId/:slug"
          element={<RecipeDetailPage />}
        />
      </Routes>,
      {route: '/recipes/recipe-uuid-1'},
    );
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    // The design-system page is single-scroll (B7 C7): every section
    // renders on the page — no tab switching.
    expect(screen.getByText(/Flour/)).toBeInTheDocument();
    expect(screen.getByText('Mix dry ingredients')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Turned out great')).toBeInTheDocument();
    });
    await waitFor(() => {
      // The calorie count renders in the overview stat band and again
      // in the nutrition section — both are on the page at once now.
      expect(screen.getAllByText('250').length).toBeGreaterThan(0);
    });
  });

  test('renders the metadata pill with category and total time (#640)', async () => {
    await renderDetailAt('/recipes/recipe-uuid-1');
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    // The fixture carries the Dinner category tag and 15m prep +
    // 30m cook: the pill joins category \u2022 total time \u2022 serves.
    expect(
      screen.getByText('Dinner \u2022 45 min \u2022 Serves 4'),
    ).toBeInTheDocument();
  });

  test('omits category and total time from the pill when absent (#640)', async () => {
    // The default view's pill reads the recipe payload itself (the
    // version-detail query only feeds alternate-version views), so
    // the absent case overrides the recipe endpoint.
    server.use(
      http.get('http://localhost:8080/api/recipes/:id', ({params}) =>
        HttpResponse.json(
          makeRecipeDetail({
            id: params['id'] as string,
            // The test session (user-1) owns this recipe: the unified
            // host renders the owner form for it (#649).
            userId: 'user-1',
            tags: [],
            prepTimeMin: null,
            cookTimeMin: null,
          }),
        ),
      ),
    );
    await renderDetailAt('/recipes/recipe-uuid-1');
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    expect(screen.getByText('Serves 4')).toBeInTheDocument();
    expect(screen.queryByText(/45 min/)).not.toBeInTheDocument();
  });

  test('deletes the recipe from the detail page and returns to the list', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/recipes/:recipeId"
          element={<RecipeDetailPage />}
        />
        <Route
          path="/recipes/:recipeId/:slug"
          element={<RecipeDetailPage />}
        />
        <Route
          path="/recipes"
          element={<div>Recipes list page</div>}
        />
      </Routes>,
      {route: '/recipes/recipe-uuid-1'},
    );
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    // The overview's Delete button by role/name: the cook log entry's
    // delete shares the "Delete" text but carries its own label
    // ("Delete cook log 1 from …"), so the name match is unique.
    await userEvent.click(screen.getByRole('button', {name: 'Delete'}));
    // #263: deletion confirms host-side (the design-system Dialog);
    // confirming runs the mutation and returns to the list.
    await userEvent.click(await screen.findByText('Confirm delete'));
    expect(await screen.findByText('Recipes list page')).toBeInTheDocument();
  });

  test('shows a not-found state for a deleted or unknown recipe', async () => {
    const missingId = '00000000-0000-4000-8000-000000000099';
    server.use(
      http.get(`http://localhost:8080/api/recipes/${missingId}`, () =>
        // Mirrors the real route: 404 with {error: 'Recipe not found'}.
        HttpResponse.json({error: 'Recipe not found'}, {status: 404}),
      ),
    );

    await renderWithProviders(
      <Routes>
        <Route
          path="/recipes/:recipeId"
          element={<RecipeDetailPage />}
        />
        <Route
          path="/recipes/:recipeId/:slug"
          element={<RecipeDetailPage />}
        />
      </Routes>,
      {route: `/recipes/${missingId}`},
    );

    // #273: a settled 404 must not leave the page on the loading skeleton.
    await waitFor(() => {
      expect(screen.getByText('Page not found')).toBeInTheDocument();
    });
  });

  test('shows a not-found state when a refetch 404s over a cached recipe', async () => {
    const queryClient = makeQueryClient();
    await renderWithProviders(
      <Routes>
        <Route
          path="/recipes/:recipeId"
          element={<RecipeDetailPage />}
        />
        <Route
          path="/recipes/:recipeId/:slug"
          element={<RecipeDetailPage />}
        />
      </Routes>,
      {route: '/recipes/recipe-uuid-1', queryClient},
    );
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });

    // The recipe is deleted elsewhere; the detail refetch now answers
    // 404 while TanStack Query still holds the cached recipe data.
    server.use(
      http.get('http://localhost:8080/api/recipes/recipe-uuid-1', () =>
        HttpResponse.json({error: 'Recipe not found'}, {status: 404}),
      ),
    );
    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.recipe('recipe-uuid-1'),
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Page not found')).toBeInTheDocument();
    });
    expect(screen.queryByText('Test Recipe')).not.toBeInTheDocument();
  });

  test('stays on the loading gate while a recipe fetch is paused offline', async () => {
    ReactQuery.onlineManager.setOnline(false);
    try {
      const queryClient = makeQueryClient();
      await renderWithProviders(
        <Routes>
          <Route
            path="/recipes/:recipeId"
            element={<RecipeDetailPage />}
          />
        </Routes>,
        {route: '/recipes/recipe-uuid-1', queryClient},
      );

      // The uncached query really is paused: still pending, not settled.
      const state = queryClient.getQueryState(
        queryKeys.recipe('recipe-uuid-1'),
      );
      expect(state?.status).toBe('pending');
      expect(state?.fetchStatus).toBe('paused');

      // A paused fetch has isLoading false in TanStack Query v5; the page
      // must stay on the loading gate (isPending), not render not-found
      // for a recipe that may exist.
      expect(screen.queryByText('Page not found')).not.toBeInTheDocument();
      expect(screen.queryByText('Test Recipe')).not.toBeInTheDocument();
      // The gate's spinner appears after its 100 ms delay; finding it
      // proves the page is on the loading gate, not just blank.
      await screen.findByRole('status', {name: 'Loading'});
    } finally {
      ReactQuery.onlineManager.setOnline(true);
    }
  });

  test('does not record a view when recipeId is missing', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/recipes"
          element={<RecipeDetailPage />}
        />
      </Routes>,
      {route: '/recipes'},
    );
    expect(screen.queryByText('Test Recipe')).not.toBeInTheDocument();
  });

  test('loads an alternate selected version', async () => {
    server.use(
      http.get('http://localhost:8080/api/recipes/:id/versions', () =>
        HttpResponse.json([
          makeRecipeVersionSummary(),
          makeRecipeVersionSummary({
            id: 'version-uuid-2',
            versionNumber: 2,
            derivedRole: 'archived',
            title: 'Older version',
          }),
        ]),
      ),
      http.get(
        'http://localhost:8080/api/recipes/:id/versions/:versionId',
        ({params}) =>
          HttpResponse.json(
            makeRecipeVersionDetail({
              id: params['versionId'] as string,
              title:
                params['versionId'] === 'version-uuid-2'
                  ? 'Older version'
                  : 'Test Recipe',
            }),
          ),
      ),
    );
    await renderWithProviders(
      <Routes>
        <Route
          path="/recipes/:recipeId"
          element={<RecipeDetailPage />}
        />
        <Route
          path="/recipes/:recipeId/:slug"
          element={<RecipeDetailPage />}
        />
      </Routes>,
      {route: '/recipes/recipe-uuid-1'},
    );
    await waitFor(() => {
      expect(
        screen.getByRole('combobox', {name: 'Version'}),
      ).toBeInTheDocument();
    });
    // The design-system SelectField is a trigger + listbox, not a
    // native <select>: open it and pick the version by its row label.
    // (In @spudly/ui 6.x the field's label element and an inner
    // aria-labelled element both match a label-text query, so query
    // the trigger by its combobox role.) fireEvent for the option:
    // the listbox item carries pointer-events: none in jsdom, which
    // userEvent refuses.
    await userEvent.click(screen.getByRole('combobox', {name: 'Version'}));
    fireEvent.click(await screen.findByRole('option', {name: 'v2 — Archived'}));
    await waitFor(() => {
      expect(screen.getByText('Older version')).toBeInTheDocument();
    });
  });

  test('selects version from versionId search param', async () => {
    server.use(
      http.get('http://localhost:8080/api/recipes/:id/versions', () =>
        HttpResponse.json([
          makeRecipeVersionSummary(),
          makeRecipeVersionSummary({
            id: 'version-uuid-2',
            versionNumber: 2,
            derivedRole: 'archived',
            title: 'Older version',
          }),
        ]),
      ),
      http.get(
        'http://localhost:8080/api/recipes/:id/versions/:versionId',
        ({params}) =>
          HttpResponse.json(
            makeRecipeVersionDetail({
              id: params['versionId'] as string,
              title:
                params['versionId'] === 'version-uuid-2'
                  ? 'Older version'
                  : 'Test Recipe',
            }),
          ),
      ),
    );
    await renderWithProviders(
      <Routes>
        <Route
          path="/recipes/:recipeId"
          element={<RecipeDetailPage />}
        />
        <Route
          path="/recipes/:recipeId/:slug"
          element={<RecipeDetailPage />}
        />
      </Routes>,
      {route: '/recipes/recipe-uuid-1?versionId=version-uuid-2'},
    );
    await waitFor(() => {
      expect(screen.getByText('Older version')).toBeInTheDocument();
    });
  });
  test('canonicalizes a bare-ID URL to the slugged URL (#419)', async () => {
    await renderDetailAt('/recipes/recipe-uuid-1');
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/recipes/recipe-uuid-1/test-recipe',
    );
  });

  test('canonicalizes a bare-ID URL for a reserved slug to its disambiguated form (#419)', async () => {
    server.use(
      http.get('http://localhost:8080/api/recipes/:id', () =>
        HttpResponse.json(makeRecipeDetail({title: 'Cook', slug: 'cook'})),
      ),
    );
    await renderDetailAt('/recipes/recipe-uuid-1');
    // '/recipes/recipe-uuid-1/cook' is the cooking-mode route, so the
    // canonical detail URL must use the disambiguated slug.
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/recipes/recipe-uuid-1/cook-recipe',
      );
    });
  });

  test('canonicalizes a wrong or stale slug (#419)', async () => {
    await renderDetailAt('/recipes/recipe-uuid-1/stale-slug');
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/recipes/recipe-uuid-1/test-recipe',
    );
  });

  test('renders a correct slug in place without a redirect loop (#419)', async () => {
    await renderDetailAt('/recipes/recipe-uuid-1/test-recipe');
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/recipes/recipe-uuid-1/test-recipe',
    );
    expect(screen.getByText(/Flour/)).toBeInTheDocument();
  });

  test("lands a renamed recipe's old URL on the new canonical URL (#419)", async () => {
    server.use(
      http.get('http://localhost:8080/api/recipes/:id', () =>
        HttpResponse.json(
          makeRecipeDetail({title: 'Renamed Recipe', slug: 'renamed-recipe'}),
        ),
      ),
    );
    await renderDetailAt('/recipes/recipe-uuid-1/test-recipe');
    await waitFor(() => {
      expect(screen.getByText('Renamed Recipe')).toBeInTheDocument();
    });
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/recipes/recipe-uuid-1/renamed-recipe',
    );
  });

  test('renders the guest signed-in treatment for a signed-in non-owner (#649)', async () => {
    server.use(
      http.get('http://localhost:8080/api/recipes/:id', ({params}) =>
        HttpResponse.json({
          ...makeRecipeDetail({
            id: params['id'] as string,
            userId: 'other-user',
          }),
          communityRating: null,
          viewerRating: null,
          viewerRatingIsStale: false,
        }),
      ),
    );
    await renderDetailAt('/recipes/recipe-uuid-1/test-recipe');
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    // The DS guest form's signed-in variant: save-a-copy, no owner
    // actions (no Delete, no version picker).
    expect(
      screen.getByRole('button', {name: 'Save a copy'}),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {name: 'Delete'}),
    ).not.toBeInTheDocument();
  });
});

// The sign-up stub echoes its search string so the clone test can
// assert the navigation carried the clone target, not just that
// the route rendered.
function SignUpRoute() {
  const {search} = useLocation();
  return <div>{`Sign up route${search}`}</div>;
}

const API = 'http://localhost:8080';

const renderPublicAt = async (
  route: string,
  options: {withAuth?: boolean} = {},
) =>
  renderWithProviders(
    <Routes>
      <Route
        path="/recipe/:id/:slug"
        element={<RecipeDetailPage />}
      />
      <Route
        path="/recipe/:id"
        element={<RecipeDetailPage />}
      />
      <Route
        path="/signup"
        element={<SignUpRoute />}
      />
    </Routes>,
    {route, withAuth: options.withAuth ?? false},
  );

// The public permalink route renders the SAME unified host (#649
// tranche 2 — these cases are ported from the retired
// PublicRecipePage.test.tsx): the DS page's guest form inside the one
// AppShell for signed-out viewers, and the signed-in / owner
// treatments of the same page for signed-in viewers.
describe('RecipeDetailPage on the public route (#649 unified host)', () => {
  test('renders public recipe sections in a single scroll without auth', async () => {
    await renderPublicAt('/recipe/recipe-uuid-1/test-recipe');

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', {name: 'Sign up free'}),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {name: 'Get the mobile app'}),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'Privacy Policy'})).toHaveAttribute(
      'href',
      '/privacy',
    );
    const brandLinks = screen.getAllByRole('link', {name: 'Eciperay'});
    expect(brandLinks).toHaveLength(2);
    for (const brandLink of brandLinks) {
      expect(brandLink).toHaveAttribute('href', '/');
    }
    expect(brandLinks[0]?.querySelector('svg') ?? null).not.toBeNull();
    const signInLinks = screen.getAllByRole('link', {name: 'Sign in'});
    expect(signInLinks.length).toBeGreaterThanOrEqual(1);
    for (const link of signInLinks) {
      expect(link).toHaveAttribute('href', '/login');
    }

    // Single scroll: ingredients and instructions render with the
    // overview — no tab switch is involved.
    expect(screen.getByText(/Flour/)).toBeInTheDocument();
    expect(screen.getByText('Mix dry ingredients')).toBeInTheDocument();

    // Signed out, Clone routes to sign-up carrying the clone target.
    await userEvent.click(
      screen.getByRole('button', {name: 'Clone this recipe'}),
    );
    await waitFor(() => {
      expect(
        screen.getByText('Sign up route?cloneRecipe=recipe-uuid-1'),
      ).toBeInTheDocument();
    });
  });

  test('sets SEO metadata for public recipe pages', async () => {
    await renderPublicAt('/recipe/recipe-uuid-1/test-recipe');

    await waitFor(() => {
      expect(document.title).toBe(buildRecipePageTitle('Test Recipe'));
    });
    expect(
      document.head.querySelector('meta[property="og:url"]'),
    ).toHaveAttribute(
      'content',
      'http://localhost:3000/recipe/recipe-uuid-1/test-recipe',
    );
    expect(
      document.head.querySelector('script[type="application/ld+json"]')
        ?.textContent,
    ).toContain('"@type":"Recipe"');
  });

  test('redirects to canonical slug when API reports slug mismatch', async () => {
    await renderPublicAt('/recipe/recipe-uuid-1/stale-slug');

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
  });

  test('preserves share token when redirecting stale slug', async () => {
    let requestUrl = '';
    server.use(
      http.get(`${API}/api/public/recipes/:id/:slug`, ({request}) => {
        if (request.url.includes('/comments')) {
          return HttpResponse.json([]);
        }
        requestUrl = request.url;
        const {userId: _userId, ...publicRecipe} = makeRecipeDetail({
          visibility: 'public',
        });
        const slug = request.url.split('/').pop()?.split('?')[0] ?? '';
        return HttpResponse.json({
          recipe: publicRecipe,
          canonicalSlug: 'test-recipe',
          ...(slug === 'test-recipe' ? {} : {slugMismatch: true}),
        });
      }),
    );

    await renderPublicAt('/recipe/recipe-uuid-1/stale-slug?t=keep-token');

    await waitFor(() => {
      expect(requestUrl).toContain('t=keep-token');
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
  });

  test('shows not found when query resolves without data', async () => {
    const useQuerySpy = vi
      .spyOn(ReactQuery, 'useQuery')
      .mockReturnValue({
        data: undefined,
        error: null,
        isError: false,
        isLoading: false,
        isPending: false,
        status: 'success',
      } as unknown as ReactQuery.UseQueryResult);

    try {
      await renderPublicAt('/recipe/recipe-uuid-1/test-recipe');
      expect(screen.getByText('Recipe not found')).toBeInTheDocument();
    } finally {
      useQuerySpy.mockRestore();
    }
  });

  test('shows generic not found message for non-error failures', async () => {
    const useQuerySpy = vi
      .spyOn(ReactQuery, 'useQuery')
      .mockReturnValue({
        data: undefined,
        error: 'failed',
        isError: true,
        isLoading: false,
        isPending: false,
        status: 'error',
      } as unknown as ReactQuery.UseQueryResult);

    try {
      await renderPublicAt('/recipe/recipe-uuid-1/test-recipe');
      expect(screen.getByText('Recipe not found')).toBeInTheDocument();
    } finally {
      useQuerySpy.mockRestore();
    }
  });

  test('shows not found when slug param is missing', async () => {
    await renderPublicAt('/recipe/recipe-uuid-1');
    expect(screen.getByText('Recipe not found')).toBeInTheDocument();
  });

  test('shows loading state while fetching', async () => {
    server.use(
      http.get(`${API}/api/public/recipes/:id/:slug`, async () => {
        await new Promise(resolve => {
          setTimeout(resolve, 50);
        });
        const {userId: _userId, ...publicRecipe} = makeRecipeDetail({
          visibility: 'public',
        });
        return HttpResponse.json({
          recipe: publicRecipe,
          canonicalSlug: 'test-recipe',
        });
      }),
    );

    await renderPublicAt('/recipe/recipe-uuid-1/test-recipe');

    expect(screen.getByText('Ingredients')).toBeInTheDocument();
    expect(screen.getByText('Instructions')).toBeInTheDocument();
    expect(screen.queryByText('Test Recipe')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
  });

  test('shows not found message for missing recipes', async () => {
    server.use(
      http.get(`${API}/api/public/recipes/:id/:slug`, () =>
        HttpResponse.json({error: 'Recipe not found'}, {status: 404}),
      ),
    );

    await renderPublicAt('/recipe/missing-id/any-slug');

    await waitFor(() => {
      expect(screen.getByText('Recipe not found')).toBeInTheDocument();
    });
  });

  test('shows access denied message for invalid unlisted links', async () => {
    server.use(
      http.get(`${API}/api/public/recipes/:id/:slug`, () =>
        HttpResponse.json({error: 'Recipe access denied'}, {status: 403}),
      ),
    );

    await renderPublicAt('/recipe/recipe-uuid-1/test-recipe');

    await waitFor(() => {
      expect(screen.getByText('Recipe unavailable')).toBeInTheDocument();
    });
  });

  test('passes share token query param to public API', async () => {
    let requestUrl = '';
    server.use(
      http.get(`${API}/api/public/recipes/:id/:slug`, ({request}) => {
        if (request.url.includes('/comments')) {
          return HttpResponse.json([]);
        }
        requestUrl = request.url;
        const {userId: _userId, ...publicRecipe} = makeRecipeDetail({
          visibility: 'unlisted',
        });
        return HttpResponse.json({
          recipe: publicRecipe,
          canonicalSlug: 'test-recipe',
        });
      }),
    );

    await renderPublicAt('/recipe/recipe-uuid-1/test-recipe?t=share-token');

    await waitFor(() => {
      expect(requestUrl).toContain('t=share-token');
    });
  });

  test('gives a signed-in non-owner the signed-in treatment of the same page (#649)', async () => {
    server.use(
      http.get(`${API}/api/recipes/:id`, ({params}) =>
        HttpResponse.json({
          ...makeRecipeDetail({
            id: params['id'] as string,
            userId: 'other-user',
          }),
          communityRating: null,
          viewerRating: null,
          viewerRatingIsStale: false,
        }),
      ),
    );

    await renderPublicAt('/recipe/recipe-uuid-1/test-recipe', {
      withAuth: true,
    });

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    // Signed-in treatment on the public link itself: save-a-copy
    // instead of the sign-up CTA, and no owner actions.
    expect(
      screen.getByRole('button', {name: 'Save a copy'}),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {name: 'Sign up free'}),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', {name: 'Delete'}),
    ).not.toBeInTheDocument();
  });

  test('gives the owner the owner treatment on a public link (#649)', async () => {
    // The default authenticated detail handler serves the test
    // session's own recipe (userId user-1).
    await renderPublicAt('/recipe/recipe-uuid-1/test-recipe', {
      withAuth: true,
    });

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    expect(
      await screen.findByRole('button', {name: 'Delete'}),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {name: 'Save a copy'}),
    ).not.toBeInTheDocument();
  });
});

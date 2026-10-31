import {buildRecipePageTitle} from '@eciperay/client';
import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as ReactQuery from '@tanstack/react-query';
import {http, HttpResponse} from 'msw';
import {Route, Routes} from 'react-router-dom';
import {vi} from 'vitest';

import {makeRecipeDetail} from '../test/fixtures/recipe.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {PublicRecipePage} from './PublicRecipePage.js';

const API = 'http://localhost:8080';

// The host renders the design system's PublicRecipePage inside
// the DS PublicPageFrame (B7 cluster 11); these tests drive that
// page's real DOM: the sections stack in a single scroll (no
// tabs), and the CTA bar's intents are buttons whose callbacks the
// host wires to navigation and the clone mutation.
describe('PublicRecipePage', () => {
  test('renders public recipe sections in a single scroll without auth', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/recipe/:id/:slug"
          element={<PublicRecipePage />}
        />
        <Route
          path="/signup"
          element={<div>Sign up route</div>}
        />
      </Routes>,
      {route: '/recipe/recipe-uuid-1/test-recipe', withAuth: false},
    );

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

    // Single scroll: ingredients and instructions render with the
    // overview — no tab switch is involved.
    expect(screen.getByText(/Flour/)).toBeInTheDocument();
    expect(screen.getByText('Mix dry ingredients')).toBeInTheDocument();

    // Signed out, Clone routes to sign-up carrying the clone target.
    await userEvent.click(
      screen.getByRole('button', {name: 'Clone this recipe'}),
    );
    await waitFor(() => {
      expect(screen.getByText('Sign up route')).toBeInTheDocument();
    });
  });

  test('sets SEO metadata for public recipe pages', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/recipe/:id/:slug"
          element={<PublicRecipePage />}
        />
      </Routes>,
      {route: '/recipe/recipe-uuid-1/test-recipe', withAuth: false},
    );

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
    await renderWithProviders(
      <Routes>
        <Route
          path="/recipe/:id/:slug"
          element={<PublicRecipePage />}
        />
      </Routes>,
      {route: '/recipe/recipe-uuid-1/stale-slug', withAuth: false},
    );

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

    await renderWithProviders(
      <Routes>
        <Route
          path="/recipe/:id/:slug"
          element={<PublicRecipePage />}
        />
      </Routes>,
      {route: '/recipe/recipe-uuid-1/stale-slug?t=keep-token', withAuth: false},
    );

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
      await renderWithProviders(
        <Routes>
          <Route
            path="/recipe/:id/:slug"
            element={<PublicRecipePage />}
          />
        </Routes>,
        {route: '/recipe/recipe-uuid-1/test-recipe', withAuth: false},
      );

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
      await renderWithProviders(
        <Routes>
          <Route
            path="/recipe/:id/:slug"
            element={<PublicRecipePage />}
          />
        </Routes>,
        {route: '/recipe/recipe-uuid-1/test-recipe', withAuth: false},
      );

      expect(screen.getByText('Recipe not found')).toBeInTheDocument();
    } finally {
      useQuerySpy.mockRestore();
    }
  });

  test('shows not found when slug param is missing', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/recipe/:id"
          element={<PublicRecipePage />}
        />
      </Routes>,
      {route: '/recipe/recipe-uuid-1', withAuth: false},
    );

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

    await renderWithProviders(
      <Routes>
        <Route
          path="/recipe/:id/:slug"
          element={<PublicRecipePage />}
        />
      </Routes>,
      {route: '/recipe/recipe-uuid-1/test-recipe', withAuth: false},
    );

    expect(
      screen.getByRole('progressbar', {name: 'Loading recipe'}),
    ).toBeInTheDocument();
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

    await renderWithProviders(
      <Routes>
        <Route
          path="/recipe/:id/:slug"
          element={<PublicRecipePage />}
        />
      </Routes>,
      {route: '/recipe/missing-id/any-slug', withAuth: false},
    );

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

    await renderWithProviders(
      <Routes>
        <Route
          path="/recipe/:id/:slug"
          element={<PublicRecipePage />}
        />
      </Routes>,
      {route: '/recipe/recipe-uuid-1/test-recipe', withAuth: false},
    );

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

    await renderWithProviders(
      <Routes>
        <Route
          path="/recipe/:id/:slug"
          element={<PublicRecipePage />}
        />
      </Routes>,
      {
        route: '/recipe/recipe-uuid-1/test-recipe?t=share-token',
        withAuth: false,
      },
    );

    await waitFor(() => {
      expect(requestUrl).toContain('t=share-token');
    });
  });
});

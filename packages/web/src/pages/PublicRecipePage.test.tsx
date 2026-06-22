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

describe('PublicRecipePage', () => {
  test('renders public recipe and switches tabs without auth', async () => {
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
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', {name: 'Sign up free'})).toHaveAttribute(
      'href',
      '/signup',
    );
    expect(
      screen.getByRole('link', {name: 'Clone this recipe'}),
    ).toHaveAttribute('href', '/signup?cloneRecipe=recipe-uuid-1');
    expect(screen.getByRole('link', {name: 'Privacy Policy'})).toHaveAttribute(
      'href',
      '/privacy',
    );

    await userEvent.click(screen.getByText('Ingredients'));
    expect(screen.getByText(/Flour/)).toBeInTheDocument();
    await userEvent.click(screen.getByText('Instructions'));
    expect(screen.getByText('Mix dry ingredients')).toBeInTheDocument();
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
        requestUrl = request.url;
        const {userId: _userId, ...publicRecipe} = makeRecipeDetail({
          visibility: 'public',
        });
        void _userId;
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
        void _userId;
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

    expect(screen.getByText('Loading…')).toBeInTheDocument();
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
        requestUrl = request.url;
        const {userId: _userId, ...publicRecipe} = makeRecipeDetail({
          visibility: 'unlisted',
        });
        void _userId;
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

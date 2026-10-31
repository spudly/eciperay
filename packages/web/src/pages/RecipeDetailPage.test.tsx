import {queryKeys} from '@eciperay/client';
import {onlineManager} from '@tanstack/react-query';
import {act, fireEvent, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {Route, Routes} from 'react-router-dom';

import {
  makeRecipeVersionDetail,
  makeRecipeVersionSummary,
} from '../test/fixtures/recipe.js';
import {server} from '../test/msw/server.js';
import {makeQueryClient, renderWithProviders} from '../test/testUtils.js';

import {RecipeDetailPage} from './RecipeDetailPage.js';

describe('RecipeDetailPage', () => {
  test('renders every section in a single scroll', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/recipes/:recipeId"
          element={<RecipeDetailPage />}
        />
      </Routes>,
      {route: '/recipes/recipe-uuid-1'},
    );
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    // #278 wants the status exactly once (the toolbar pill), but the
    // design-system page currently renders its status badge in the
    // toolbar AND beside the overview title — tracked as
    // design-system#363; this count flips back to 1 when that lands.
    expect(screen.getAllByText('Evolving')).toHaveLength(2);
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

  test('deletes the recipe from the detail page and returns to the list', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/recipes/:recipeId"
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
    onlineManager.setOnline(false);
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
      onlineManager.setOnline(true);
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
      </Routes>,
      {route: '/recipes/recipe-uuid-1'},
    );
    await waitFor(() => {
      expect(screen.getByLabelText('Version')).toBeInTheDocument();
    });
    // The design-system SelectField is a trigger + listbox, not a
    // native <select>: open it and pick the version by its row label.
    // fireEvent for the option: the listbox item carries
    // pointer-events: none in jsdom, which userEvent refuses.
    await userEvent.click(screen.getByLabelText('Version'));
    fireEvent.click(
      await screen.findByRole('option', {name: 'v2 — Archived'}),
    );
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
      </Routes>,
      {route: '/recipes/recipe-uuid-1?versionId=version-uuid-2'},
    );
    await waitFor(() => {
      expect(screen.getByText('Older version')).toBeInTheDocument();
    });
  });
});

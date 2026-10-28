import {queryKeys} from '@eciperay/client';
import {act, screen, waitFor} from '@testing-library/react';
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
  test('renders tabs and switches between them', async () => {
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
    expect(screen.getAllByText('Evolving')[0]).toBeInTheDocument();
    await userEvent.click(screen.getByText('Ingredients'));
    expect(screen.getByText(/Flour/)).toBeInTheDocument();
    await userEvent.click(screen.getByText('Instructions'));
    expect(screen.getByText('Mix dry ingredients')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Cook History'));
    await waitFor(() => {
      expect(screen.getByText('Turned out great')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Nutrition'));
    await waitFor(() => {
      expect(screen.getByText('250')).toBeInTheDocument();
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
    await userEvent.click(screen.getByText('Delete'));
    await userEvent.click(screen.getByText('Confirm delete'));
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
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
    await userEvent.selectOptions(
      screen.getByRole('combobox'),
      'version-uuid-2',
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

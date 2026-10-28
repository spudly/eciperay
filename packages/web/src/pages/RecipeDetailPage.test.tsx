import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {Route, Routes} from 'react-router-dom';

import {
  makeRecipeVersionDetail,
  makeRecipeVersionSummary,
} from '../test/fixtures/recipe.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

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
    // #278: the status renders exactly once (the chrome's pill), not
    // again in the Overview tab under the title.
    expect(screen.getAllByText('Evolving')).toHaveLength(1);
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

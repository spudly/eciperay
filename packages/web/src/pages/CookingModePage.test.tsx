import {fireEvent, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {Route, Routes} from 'react-router-dom';

import {makeRecipeVersionDetail} from '../test/fixtures/recipe.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {CookingModePage} from './CookingModePage.js';

describe('CookingModePage', () => {
  test('navigates steps with buttons and keyboard', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/recipes/:recipeId/cook"
          element={<CookingModePage />}
        />
      </Routes>,
      {route: '/recipes/recipe-uuid-1/cook'},
    );
    await waitFor(() => {
      expect(screen.getByText('Mix dry ingredients')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Next →'));
    expect(screen.getByText('Bake at 350°F')).toBeInTheDocument();
    await userEvent.click(screen.getByText('← Back'));
    expect(screen.getByText('Mix dry ingredients')).toBeInTheDocument();
    fireEvent.keyDown(window, {key: 'ArrowRight'});
    expect(screen.getByText('Bake at 350°F')).toBeInTheDocument();
    fireEvent.keyDown(window, {key: 'ArrowLeft'});
    expect(screen.getByText('Mix dry ingredients')).toBeInTheDocument();
    fireEvent.keyDown(window, {key: 'ArrowDown'});
    expect(screen.getByText('Bake at 350°F')).toBeInTheDocument();
    fireEvent.keyDown(window, {key: 'ArrowUp'});
    fireEvent.keyDown(window, {key: 'Escape'});
    expect(screen.getByText('How did it go?')).toBeInTheDocument();
  });

  test('shows scaled ingredients when servings are provided', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/recipes/:recipeId/cook"
          element={<CookingModePage />}
        />
      </Routes>,
      {route: '/recipes/recipe-uuid-1/cook?servings=8'},
    );
    await waitFor(() => {
      expect(screen.getByText('4 cups Flour')).toBeInTheDocument();
      expect(screen.getByText(/scaled to 8 servings/)).toBeInTheDocument();
    });
  });

  test('loads an alternate version from the query string', async () => {
    server.use(
      http.get(
        'http://localhost:8080/api/recipes/:id/versions/:versionId',
        () =>
          HttpResponse.json(
            makeRecipeVersionDetail({
              id: 'version-uuid-2',
              title: 'Alternate version',
              instructions: [
                {
                  id: 'ins-alt',
                  recipeVersionId: 'version-uuid-2',
                  stepNumber: 1,
                  body: 'Alternate step',
                },
              ],
            }),
          ),
      ),
    );
    await renderWithProviders(
      <Routes>
        <Route
          path="/recipes/:recipeId/cook"
          element={<CookingModePage />}
        />
      </Routes>,
      {route: '/recipes/recipe-uuid-1/cook?versionId=version-uuid-2'},
    );
    await waitFor(() => {
      expect(screen.getByText('Alternate step')).toBeInTheDocument();
    });
  });

  test('done button shows cook log form', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/recipes/:recipeId/cook"
          element={<CookingModePage />}
        />
      </Routes>,
      {route: '/recipes/recipe-uuid-1/cook'},
    );
    await waitFor(() => {
      expect(screen.getByText('Done')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Done'));
    expect(screen.getByText('How did it go?')).toBeInTheDocument();
    fireEvent.keyDown(window, {key: 'ArrowRight'});
    expect(screen.getByText('How did it go?')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Skip'));
  });

  test('saves cook log and navigates back', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/recipes/:recipeId/cook"
          element={<CookingModePage />}
        />
        <Route
          path="/recipes/:recipeId"
          element={<div>Recipe detail</div>}
        />
      </Routes>,
      {
        routerProps: {
          initialEntries: [
            '/recipes/recipe-uuid-1',
            '/recipes/recipe-uuid-1/cook',
          ],
          initialIndex: 1,
        },
      },
    );
    await waitFor(() => {
      expect(screen.getByText('Done')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Done'));
    await userEvent.click(screen.getByLabelText('5 stars'));
    await userEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(screen.getByText('Recipe detail')).toBeInTheDocument();
    });
  });
});

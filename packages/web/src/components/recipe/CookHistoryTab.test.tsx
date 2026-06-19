import {screen, waitFor} from '@testing-library/react';
import {http, HttpResponse} from 'msw';

import {makeCookLog} from '../../test/fixtures/recipe.js';
import {server} from '../../test/msw/server.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {CookHistoryTab} from './CookHistoryTab.js';

describe('CookHistoryTab', () => {
  test('renders cook log timeline', async () => {
    await renderWithProviders(
      <CookHistoryTab
        recipeId="recipe-uuid-1"
        versionId="version-uuid-1"
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Turned out great')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('4 stars')).toBeInTheDocument();
  });

  test('shows empty state when no cooks exist', async () => {
    server.use(
      http.get(
        'http://localhost:8080/api/recipes/:id/versions/:versionId/cooks',
        () => HttpResponse.json([]),
      ),
    );
    await renderWithProviders(
      <CookHistoryTab
        recipeId="recipe-uuid-1"
        versionId="version-uuid-1"
      />,
    );
    expect(await screen.findByText(/No cooks logged yet/)).toBeInTheDocument();
  });

  test('renders cook logs without ratings or notes', async () => {
    server.use(
      http.get(
        'http://localhost:8080/api/recipes/:id/versions/:versionId/cooks',
        () =>
          HttpResponse.json([
            makeCookLog({authorStarRating: null, notes: null}),
          ]),
      ),
    );
    await renderWithProviders(
      <CookHistoryTab
        recipeId="recipe-uuid-1"
        versionId="version-uuid-1"
      />,
    );
    expect(await screen.findByText(/2024/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/stars/)).not.toBeInTheDocument();
  });
});

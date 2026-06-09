import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {Route, Routes} from 'react-router-dom';

import {recipoo} from '../lib/api.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {ImportUrlPage} from './ImportUrlPage.js';

describe('ImportUrlPage', () => {
  test('imports from url', async () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/add/url"
          element={<ImportUrlPage />}
        />
        <Route
          path="/import/review/:recipeId"
          element={<div>Review</div>}
        />
      </Routes>,
      {route: '/add/url'},
    );
    await userEvent.type(
      screen.getByPlaceholderText('https://example.com/recipe'),
      'https://example.com/recipe',
    );
    await userEvent.click(screen.getByText('Import'));
    await waitFor(() => {
      expect(screen.getByText('Review')).toBeInTheDocument();
    });
  });

  test('shows error on failure', async () => {
    server.use(
      http.post('http://localhost:8080/recipes/import/url', () =>
        HttpResponse.json({error: 'bad'}, {status: 500}),
      ),
    );
    renderWithProviders(<ImportUrlPage />, {route: '/add/url'});
    await userEvent.type(
      screen.getByPlaceholderText('https://example.com/recipe'),
      'https://example.com/recipe',
    );
    await userEvent.click(screen.getByText('Import'));
    await waitFor(() => {
      expect(screen.getByText(/API error 500/i)).toBeInTheDocument();
    });
  });

  test('shows generic error for non-Error throws', async () => {
    vi.spyOn(recipoo.import, 'importUrl').mockRejectedValueOnce('nope');
    renderWithProviders(<ImportUrlPage />, {route: '/add/url'});
    await userEvent.type(
      screen.getByPlaceholderText('https://example.com/recipe'),
      'https://example.com/recipe',
    );
    await userEvent.click(screen.getByText('Import'));
    await waitFor(() => {
      expect(screen.getByText('Import failed')).toBeInTheDocument();
    });
  });
});

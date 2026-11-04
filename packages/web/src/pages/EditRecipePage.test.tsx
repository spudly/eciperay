import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {Route, Routes} from 'react-router-dom';

import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {EditRecipePage} from './EditRecipePage.js';

describe('EditRecipePage', () => {
  test('loads and saves recipe', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/recipes/:recipeId/edit"
          element={<EditRecipePage />}
        />
        <Route
          path="/recipes/:recipeId"
          element={<div>Saved</div>}
        />
      </Routes>,
      {route: '/recipes/recipe-uuid-1/edit'},
    );
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Recipe')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Save Changes'));
    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });
  });

  test('shows the server error and stays on the form when the save is rejected (#418)', async () => {
    server.use(
      http.put('http://localhost:8080/api/recipes/:id', () =>
        HttpResponse.json(
          {error: 'Recipe cannot be modified in its current status'},
          {status: 409},
        ),
      ),
    );
    await renderWithProviders(
      <Routes>
        <Route
          path="/recipes/:recipeId/edit"
          element={<EditRecipePage />}
        />
        <Route
          path="/recipes/:recipeId"
          element={<div>Saved</div>}
        />
      </Routes>,
      {route: '/recipes/recipe-uuid-1/edit'},
    );
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Recipe')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Save Changes'));
    expect(
      await screen.findByText(
        'Recipe cannot be modified in its current status',
      ),
    ).toBeInTheDocument();
    // The rejected edit is not presented as saved: no navigation away.
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });
});

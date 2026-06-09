import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Route, Routes} from 'react-router-dom';

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
});

import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Route, Routes} from 'react-router-dom';

import {renderWithProviders} from '../test/testUtils.js';

import {RecipeDetailPage} from './RecipeDetailPage.js';

describe('RecipeDetailPage', () => {
  test('renders tabs and switches between them', async () => {
    renderWithProviders(
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
    await userEvent.click(screen.getByText('Ingredients'));
    expect(screen.getByText(/Flour/)).toBeInTheDocument();
    await userEvent.click(screen.getByText('Instructions'));
    expect(screen.getByText('Mix dry ingredients')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Notes'));
    await waitFor(() => {
      expect(screen.getByText('Great recipe')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Nutrition'));
    await waitFor(() => {
      expect(screen.getByText('250')).toBeInTheDocument();
    });
  });
});

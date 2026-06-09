import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Route, Routes} from 'react-router-dom';

import {renderWithProviders} from '../test/testUtils.js';

import {ImportReviewPage} from './ImportReviewPage.js';

describe('ImportReviewPage', () => {
  test('reviews and saves imported recipe', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/import/review/:recipeId"
          element={<ImportReviewPage />}
        />
        <Route
          path="/recipes/:recipeId"
          element={<div>Saved</div>}
        />
      </Routes>,
      {route: '/import/review/recipe-uuid-1'},
    );
    await waitFor(() => {
      expect(screen.getByText('Review Import')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Save Recipe'));
    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });
  });
});

import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Route, Routes} from 'react-router-dom';

import {renderWithProviders} from '../test/testUtils.js';

import {ManualEntryPage} from './ManualEntryPage.js';

describe('ManualEntryPage', () => {
  test('creates recipe', async () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/add/manual"
          element={<ManualEntryPage />}
        />
        <Route
          path="/recipes/:recipeId"
          element={<div>Recipe Created</div>}
        />
      </Routes>,
      {route: '/add/manual'},
    );
    await userEvent.type(screen.getByLabelText('Title'), 'New Recipe');
    await userEvent.type(screen.getAllByPlaceholderText('Name')[0]!, 'Flour');
    const textareas = screen.getAllByRole('textbox');
    await userEvent.type(textareas.at(-1)!, 'Mix ingredients');
    await userEvent.click(screen.getByText('Create Recipe'));
    await waitFor(() => {
      expect(screen.getByText('Recipe Created')).toBeInTheDocument();
    });
  });
});

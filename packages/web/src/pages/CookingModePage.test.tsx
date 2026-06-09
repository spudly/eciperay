import {fireEvent, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Route, Routes} from 'react-router-dom';

import {renderWithProviders} from '../test/testUtils.js';

import {CookingModePage} from './CookingModePage.js';

describe('CookingModePage', () => {
  test('navigates steps with buttons and keyboard', async () => {
    renderWithProviders(
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
  });

  test('done button navigates back', async () => {
    renderWithProviders(
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
  });
});

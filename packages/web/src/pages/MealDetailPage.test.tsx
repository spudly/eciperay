import {fireEvent, screen, waitFor} from '@testing-library/react';
import {Route, Routes} from 'react-router-dom';
import {vi} from 'vitest';

import {MEAL_ID} from '../test/fixtures/meal.js';
import {renderWithProviders} from '../test/testUtils.js';

import {MealDetailPage} from './MealDetailPage.js';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {...actual, useNavigate: () => mockNavigate};
});

describe('MealDetailPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  test('renders meal detail', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/meals/:mealId"
          element={<MealDetailPage />}
        />
      </Routes>,
      {route: `/meals/${MEAL_ID}`},
    );
    await waitFor(() => {
      expect(screen.getByText('Sunday Dinner')).toBeInTheDocument();
    });
    expect(screen.getByText('Cook meal')).toBeInTheDocument();
  });

  test('navigates from meal actions', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/meals/:mealId"
          element={<MealDetailPage />}
        />
      </Routes>,
      {route: `/meals/${MEAL_ID}`},
    );
    await waitFor(() => {
      expect(screen.getByText('Sunday Dinner')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Edit'));
    expect(mockNavigate).toHaveBeenCalledWith(`/meals/${MEAL_ID}/edit`);
    fireEvent.click(screen.getByText('Cook meal'));
    expect(mockNavigate).toHaveBeenCalledWith(`/meals/${MEAL_ID}/cook`);
    fireEvent.click(screen.getByText('Test Recipe'));
    expect(mockNavigate).toHaveBeenCalledWith('/recipes/recipe-uuid-1');
  });
});

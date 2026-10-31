import {screen, waitFor} from '@testing-library/react';
import {Route, Routes} from 'react-router-dom';

import {MEAL_ID} from '../test/fixtures/meal.js';
import {renderWithProviders} from '../test/testUtils.js';

import {MealDetailPage} from './MealDetailPage.js';

describe('MealDetailPage', () => {
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

  test('links from meal actions', async () => {
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
    // The actions and member rows navigate, so they cross to the DS
    // page as hrefs and render as real links (#248).
    expect(screen.getByRole('link', {name: 'Edit'})).toHaveAttribute(
      'href',
      `/meals/${MEAL_ID}/edit`,
    );
    expect(screen.getByRole('link', {name: 'Cook meal'})).toHaveAttribute(
      'href',
      `/meals/${MEAL_ID}/cook`,
    );
    expect(screen.getByRole('link', {name: /Test Recipe/})).toHaveAttribute(
      'href',
      '/recipes/recipe-uuid-1',
    );
  });
});

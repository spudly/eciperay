import {fireEvent, screen, waitFor} from '@testing-library/react';
import {http, HttpResponse} from 'msw';
import {Route, Routes} from 'react-router-dom';
import {vi} from 'vitest';

import {MEAL_ID, PLAN_ID} from '../test/fixtures/meal.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {MealPlanDetailPage} from './MealPlanDetailPage.js';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {...actual, useNavigate: () => mockNavigate};
});

describe('MealPlanDetailPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    server.use(
      http.get(`http://localhost:8080/api/meal-plans/${PLAN_ID}`, () =>
        HttpResponse.json({
          id: PLAN_ID,
          userId: 'user-uuid-1',
          title: 'This week',
          notes: null,
          startsOn: '2026-01-01',
          endsOn: '2026-01-07',
          entryCount: 2,
          nutrition: {
            calories: 500,
            proteinG: 30,
            carbsG: 40,
            fatG: 10,
            fiberG: 5,
            sugarG: 8,
            sodiumMg: 900,
            preparedWeightG: 800,
            satietyScore: 50,
            status: 'ready',
            perDay: null,
          },
          goalProgress: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          entries: [
            {
              type: 'meal',
              id: 'entry-meal',
              mealId: MEAL_ID,
              sortOrder: 0,
              quantity: 1,
              title: 'Sunday Dinner',
              memberCount: 1,
              nutrition: null,
            },
            {
              type: 'recipe',
              id: 'entry-recipe',
              recipeId: 'recipe-uuid-1',
              sortOrder: 1,
              quantity: 1,
              servings: 4,
              title: 'Test Recipe',
              imageUrl: null,
              recipeServings: 4,
              accessLost: false,
              nutrition: null,
              satietyScore: null,
              nutritionStatus: null,
              calories: null,
              proteinG: null,
            },
          ],
        }),
      ),
    );
  });

  test('renders meal plan detail and navigates', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/meal-plans/:planId"
          element={<MealPlanDetailPage />}
        />
      </Routes>,
      {route: `/meal-plans/${PLAN_ID}`},
    );
    await waitFor(() => {
      expect(screen.getByText('This week')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Edit'));
    expect(mockNavigate).toHaveBeenCalledWith(`/meal-plans/${PLAN_ID}/edit`);
    fireEvent.click(screen.getByText('Shopping list'));
    expect(mockNavigate).toHaveBeenCalledWith(
      `/meal-plans/${PLAN_ID}/shopping-list`,
    );
    fireEvent.click(screen.getByText('Meal · Sunday Dinner'));
    expect(mockNavigate).toHaveBeenCalledWith(`/meals/${MEAL_ID}`);
    fireEvent.click(screen.getByText('Recipe · Test Recipe'));
    expect(mockNavigate).toHaveBeenCalledWith('/recipes/recipe-uuid-1');
    fireEvent.click(screen.getByText('Set nutrition goals'));
    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });
});

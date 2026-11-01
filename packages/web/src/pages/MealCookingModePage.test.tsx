import {fireEvent, screen, waitFor} from '@testing-library/react';
import {http, HttpResponse} from 'msw';
import {Route, Routes} from 'react-router-dom';
import {vi} from 'vitest';

import {MEAL_ID} from '../test/fixtures/meal.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {MealCookingModePage} from './MealCookingModePage.js';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {...actual, useNavigate: () => mockNavigate};
});

describe('MealCookingModePage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    server.use(
      http.get(`http://localhost:8080/api/meals/${MEAL_ID}/cook-plan`, () =>
        HttpResponse.json({
          mealId: MEAL_ID,
          totalDurationMin: 15,
          timingStatus: 'ready',
          steps: [
            {
              recipeId: 'recipe-uuid-1',
              recipeTitle: 'Test Recipe',
              instructionId: 'instr-1',
              stepNumber: 1,
              body: 'Mix dry ingredients',
              durationMin: 10,
              startOffsetMin: 0,
              endOffsetMin: 10,
            },
            {
              recipeId: 'recipe-uuid-1',
              recipeTitle: 'Test Recipe',
              instructionId: 'instr-2',
              stepNumber: 2,
              body: 'Bake',
              durationMin: 5,
              startOffsetMin: 10,
              endOffsetMin: 15,
            },
          ],
        }),
      ),
    );
  });

  test('renders cook step and navigates', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/meals/:mealId/cook"
          element={<MealCookingModePage />}
        />
      </Routes>,
      {route: `/meals/${MEAL_ID}/cook`},
    );
    await waitFor(() => {
      expect(screen.getByText('Mix dry ingredients')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Next →'));
    expect(await screen.findByText('Bake')).toBeInTheDocument();
    fireEvent.click(screen.getByText('← Back'));
    expect(screen.getByText('Mix dry ingredients')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Done'));
    expect(mockNavigate).toHaveBeenCalledWith(`/meals/${MEAL_ID}`);
  });

  test('shows the error state when the cook plan fails to load', async () => {
    server.use(
      http.get(`http://localhost:8080/api/meals/${MEAL_ID}/cook-plan`, () =>
        HttpResponse.json(
          {error: 'Unable to build cook plan for this meal'},
          {status: 502},
        ),
      ),
    );
    await renderWithProviders(
      <Routes>
        <Route
          path="/meals/:mealId/cook"
          element={<MealCookingModePage />}
        />
      </Routes>,
      {route: `/meals/${MEAL_ID}/cook`},
    );
    expect(
      await screen.findByText(
        "Couldn't load the cook plan for this meal. Please try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Sunday Dinner')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Done'));
    expect(mockNavigate).toHaveBeenCalledWith(`/meals/${MEAL_ID}`);
  });

  test('shows the error state when the meal fails to load', async () => {
    server.use(
      http.get(`http://localhost:8080/api/meals/${MEAL_ID}`, () =>
        HttpResponse.json({error: 'Meal not found'}, {status: 404}),
      ),
    );
    await renderWithProviders(
      <Routes>
        <Route
          path="/meals/:mealId/cook"
          element={<MealCookingModePage />}
        />
      </Routes>,
      {route: `/meals/${MEAL_ID}/cook`},
    );
    expect(
      await screen.findByText(
        "Couldn't load the cook plan for this meal. Please try again.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText('Done'));
    expect(mockNavigate).toHaveBeenCalledWith(`/meals/${MEAL_ID}`);
  });
});

import {act, fireEvent, screen, waitFor} from '@testing-library/react';
import {http, HttpResponse} from 'msw';
import {Route, Routes} from 'react-router-dom';
import {vi} from 'vitest';

import {MEAL_ID} from '../test/fixtures/meal.js';
import {server} from '../test/msw/server.js';
import {makeQueryClient, renderWithProviders} from '../test/testUtils.js';

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
    // A 404 meal has no detail page to return to (MealDetailPage gates
    // on `!meal` forever), so Done goes to the meals hub.
    expect(mockNavigate).toHaveBeenCalledWith('/meals');
  });

  test('shows the meal error while the cook plan is still pending', async () => {
    let releaseCookPlan!: () => void;
    const cookPlanGate = new Promise<void>(resolve => {
      releaseCookPlan = resolve;
    });
    server.use(
      http.get(`http://localhost:8080/api/meals/${MEAL_ID}`, () =>
        HttpResponse.json({error: 'Meal not found'}, {status: 404}),
      ),
      http.get(
        `http://localhost:8080/api/meals/${MEAL_ID}/cook-plan`,
        async () => {
          await cookPlanGate;
          return HttpResponse.json(
            {error: 'Unable to build cook plan for this meal'},
            {status: 502},
          );
        },
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
    // The error must render before the pending cook-plan query settles:
    // error handling takes precedence over the other query's loading.
    expect(
      await screen.findByText(
        "Couldn't load the cook plan for this meal. Please try again.",
      ),
    ).toBeInTheDocument();
    await act(async () => {
      releaseCookPlan();
      await Promise.resolve();
    });
  });

  test('keeps the cooking view when a background refetch fails', async () => {
    const queryClient = makeQueryClient();
    await renderWithProviders(
      <Routes>
        <Route
          path="/meals/:mealId/cook"
          element={<MealCookingModePage />}
        />
      </Routes>,
      {route: `/meals/${MEAL_ID}/cook`, queryClient},
    );
    expect(await screen.findByText('Mix dry ingredients')).toBeInTheDocument();
    server.use(
      http.get(`http://localhost:8080/api/meals/${MEAL_ID}`, () =>
        HttpResponse.json({error: 'Server unavailable'}, {status: 500}),
      ),
      http.get(`http://localhost:8080/api/meals/${MEAL_ID}/cook-plan`, () =>
        HttpResponse.json({error: 'Server unavailable'}, {status: 500}),
      ),
    );
    await act(async () => {
      await queryClient.refetchQueries();
    });
    // Cached meal + plan remain on screen: a refetch error is not an
    // initial-load failure and must not replace the cooking controls.
    expect(screen.getByText('Mix dry ingredients')).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Couldn't load the cook plan for this meal. Please try again.",
      ),
    ).not.toBeInTheDocument();
  });
});

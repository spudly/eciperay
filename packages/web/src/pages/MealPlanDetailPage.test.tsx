import {queryKeys} from '@eciperay/client';
import {act, screen, waitFor} from '@testing-library/react';
import {http, HttpResponse} from 'msw';
import {Route, Routes} from 'react-router-dom';

import {MEAL_ID, PLAN_ID} from '../test/fixtures/meal.js';
import {server} from '../test/msw/server.js';
import {makeQueryClient, renderWithProviders} from '../test/testUtils.js';

import {MealPlanDetailPage} from './MealPlanDetailPage.js';

describe('MealPlanDetailPage', () => {
  beforeEach(() => {
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
            // A dated plan with a per-day figure and goal progress, so
            // the caller-level caption regression below exercises the
            // real MealPlanDetailView -> NutritionGoalProgressView
            // wiring (CodeRabbit on #272).
            perDay: {
              calories: 71,
              proteinG: 4,
              carbsG: 6,
              fatG: 1,
              fiberG: 1,
              sugarG: 1,
              sodiumMg: 129,
              preparedWeightG: 114,
              satietyScore: 7,
              status: 'ready',
            },
          },
          goalProgress: {
            calories: {
              goal: 2000,
              actual: 71,
              delta: -1929,
              percentOfGoal: 3.55,
              band: 'under',
            },
            proteinG: null,
            carbsG: null,
            fatG: null,
            satietyScore: null,
          },
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

  test('shows a not-found state for a deleted or unknown plan', async () => {
    const missingId = '00000000-0000-4000-8000-000000000099';
    server.use(
      http.get(`http://localhost:8080/api/meal-plans/${missingId}`, () =>
        // Mirrors the real route: 404 with {error: 'Meal plan not found'}.
        HttpResponse.json({error: 'Meal plan not found'}, {status: 404}),
      ),
    );

    await renderWithProviders(
      <Routes>
        <Route
          path="/meal-plans/:planId"
          element={<MealPlanDetailPage />}
        />
      </Routes>,
      {route: `/meal-plans/${missingId}`},
    );

    // #260: a settled 404 must not leave the page on the loading skeleton.
    await waitFor(() => {
      expect(screen.getByText('Page not found')).toBeInTheDocument();
    });
  });

  test('shows a not-found state when a refetch 404s over a cached plan', async () => {
    const queryClient = makeQueryClient();
    await renderWithProviders(
      <Routes>
        <Route
          path="/meal-plans/:planId"
          element={<MealPlanDetailPage />}
        />
      </Routes>,
      {route: `/meal-plans/${PLAN_ID}`, queryClient},
    );
    await waitFor(() => {
      expect(screen.getByText('This week')).toBeInTheDocument();
    });

    // The plan is deleted elsewhere; the detail refetch now answers 404
    // while TanStack Query still holds the cached plan data.
    server.use(
      http.get(`http://localhost:8080/api/meal-plans/${PLAN_ID}`, () =>
        HttpResponse.json({error: 'Meal plan not found'}, {status: 404}),
      ),
    );
    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.mealPlan(PLAN_ID),
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Page not found')).toBeInTheDocument();
    });
    expect(screen.queryByText('This week')).not.toBeInTheDocument();
  });

  test('renders meal plan detail and links', async () => {
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
    // Caller-level regression (#272): the goal rows must carry the
    // per-day qualifier through MealPlanDetailPage, proving the host
    // derives it from the plan's perDay figure — the DS page has no
    // caption slot, so the qualifier rides on the row labels (the app's
    // composition); the page-level test supplies the labels directly
    // and cannot catch the wiring breaking.
    expect(screen.getByText('Calories (per-day avg)')).toBeInTheDocument();
    expect(screen.getByText('71 / 2000 · Below goal')).toBeInTheDocument();
    // Navigation crosses to the DS page as hrefs (#248): the actions
    // and entry rows render as real links.
    expect(screen.getByRole('link', {name: 'Edit'})).toHaveAttribute(
      'href',
      `/meal-plans/${PLAN_ID}/edit`,
    );
    expect(screen.getByRole('link', {name: 'Shopping list'})).toHaveAttribute(
      'href',
      `/meal-plans/${PLAN_ID}/shopping-list`,
    );
    expect(
      screen.getByRole('link', {name: /Meal · Sunday Dinner/}),
    ).toHaveAttribute('href', `/meals/${MEAL_ID}`);
    expect(
      screen.getByRole('link', {name: /Recipe · Test Recipe/}),
    ).toHaveAttribute('href', '/recipes/recipe-uuid-1');
    expect(
      screen.getByRole('link', {name: 'Set nutrition goals'}),
    ).toHaveAttribute('href', '/profile');
  });
});

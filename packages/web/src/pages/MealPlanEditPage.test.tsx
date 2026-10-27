import {queryKeys} from '@eciperay/client';
import {QueryClient} from '@tanstack/react-query';
import {fireEvent, screen, waitFor} from '@testing-library/react';
import {http, HttpResponse} from 'msw';
import {Route, Routes} from 'react-router-dom';
import {vi} from 'vitest';

import {eciperay} from '../lib/api.js';
import {makeMealPlanDetail, PLAN_ID} from '../test/fixtures/meal.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {MealPlanEditPage} from './MealPlanEditPage.js';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {...actual, useNavigate: () => mockNavigate};
});

describe('MealPlanEditPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  test('renders new meal plan form', async () => {
    await renderWithProviders(<MealPlanEditPage />);
    await waitFor(() => {
      expect(screen.getByText('Meal plan')).toBeInTheDocument();
    });
    expect(screen.getByText('Save plan')).toBeInTheDocument();
  });

  test('shows save errors', async () => {
    vi.spyOn(eciperay.mealPlans, 'create').mockRejectedValueOnce(
      new Error('Plan failed'),
    );
    await renderWithProviders(<MealPlanEditPage />, {route: '/meal-plans/new'});
    await waitFor(() => {
      expect(screen.getByText('Recipe · Test Recipe')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('Plan title'), {
      target: {value: 'Week'},
    });
    fireEvent.click(screen.getByText('Recipe · Test Recipe'));
    fireEvent.click(screen.getByText('Save plan'));
    await waitFor(() => {
      expect(screen.getByText('Plan failed')).toBeInTheDocument();
    });
  });

  test('creates a meal plan', async () => {
    server.use(
      http.post('http://localhost:8080/api/meal-plans', () =>
        HttpResponse.json(makeMealPlanDetail(), {status: 201}),
      ),
    );
    await renderWithProviders(<MealPlanEditPage />, {route: '/meal-plans/new'});
    await waitFor(() => {
      expect(screen.getByText('Recipe · Test Recipe')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('Plan title'), {
      target: {value: 'Week'},
    });
    fireEvent.click(screen.getByText('Recipe · Test Recipe'));
    fireEvent.click(screen.getByText('Save plan'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`/meal-plans/${PLAN_ID}`);
    });
  });

  test('loads and updates an existing plan', async () => {
    server.use(
      http.get(`http://localhost:8080/api/meal-plans/${PLAN_ID}`, () =>
        HttpResponse.json(
          makeMealPlanDetail({
            entries: [
              {
                type: 'recipe',
                id: 'entry-1',
                recipeId: 'recipe-uuid-1',
                sortOrder: 0,
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
      ),
      http.put(`http://localhost:8080/api/meal-plans/${PLAN_ID}`, () =>
        HttpResponse.json(makeMealPlanDetail()),
      ),
    );
    await renderWithProviders(
      <Routes>
        <Route
          path="/meal-plans/:planId/edit"
          element={<MealPlanEditPage />}
        />
      </Routes>,
      {route: `/meal-plans/${PLAN_ID}/edit`},
    );
    await waitFor(() => {
      expect(screen.getByDisplayValue('This week')).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText('+')[0]!);
    fireEvent.click(screen.getAllByText('+')[1]!);
    fireEvent.click(screen.getByText('Save plan'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`/meal-plans/${PLAN_ID}`);
    });
  });

  test('saved plan replaces the cached detail before navigating (#259)', async () => {
    const updated = makeMealPlanDetail({endsOn: '2026-01-11'});
    server.use(
      http.put(`http://localhost:8080/api/meal-plans/${PLAN_ID}`, () =>
        HttpResponse.json(updated),
      ),
    );
    const queryClient = new QueryClient({
      defaultOptions: {queries: {retry: false, staleTime: 30_000}},
    });
    // Pre-edit detail, as cached when arriving from the detail page.
    queryClient.setQueryData(
      queryKeys.mealPlan(PLAN_ID),
      makeMealPlanDetail({endsOn: '2026-01-07'}),
    );
    await renderWithProviders(
      <Routes>
        <Route
          path="/meal-plans/:planId/edit"
          element={<MealPlanEditPage />}
        />
      </Routes>,
      {route: `/meal-plans/${PLAN_ID}/edit`, queryClient},
    );
    await waitFor(() => {
      expect(screen.getByDisplayValue('This week')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Recipe · Test Recipe'));
    fireEvent.click(screen.getByText('Save plan'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`/meal-plans/${PLAN_ID}`);
    });
    // The detail page renders from this cache entry on navigation, so it
    // must already hold the saved values — not the pre-edit plan.
    expect(queryClient.getQueryData(queryKeys.mealPlan(PLAN_ID))).toEqual(
      updated,
    );
  });
});

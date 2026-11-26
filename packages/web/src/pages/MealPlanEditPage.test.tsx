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

// The form is details-only since #646 tranche 1: title, notes,
// and dates. Entries are added and edited on the plan's view
// page; this form's save carries the plan's existing entries
// through untouched (the form hook's state), and creating a
// plan saves it with no entries and lands on the view page.
describe('MealPlanEditPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  test('renders the details-only form for a new plan', async () => {
    await renderWithProviders(<MealPlanEditPage />);
    await waitFor(() => {
      expect(screen.getByText('Meal plan')).toBeInTheDocument();
    });
    expect(screen.getByText('Save plan')).toBeInTheDocument();
    // No entry picker on the form anymore (#646, tranche 1).
    expect(
      screen.queryByPlaceholderText('Search meals & recipes…'),
    ).not.toBeInTheDocument();
  });

  test('shows save errors', async () => {
    vi.spyOn(eciperay.mealPlans, 'create').mockRejectedValueOnce(
      new Error('Plan failed'),
    );
    await renderWithProviders(<MealPlanEditPage />, {route: '/meal-plans/new'});
    fireEvent.change(screen.getByPlaceholderText('Plan title'), {
      target: {value: 'Week'},
    });
    fireEvent.click(screen.getByText('Save plan'));
    await waitFor(() => {
      expect(screen.getByText('Plan failed')).toBeInTheDocument();
    });
  });

  test('creates an empty meal plan and lands on its view page', async () => {
    let postBody: unknown = null;
    server.use(
      http.post('http://localhost:8080/api/meal-plans', async ({request}) => {
        postBody = await request.json();
        return HttpResponse.json(makeMealPlanDetail(), {status: 201});
      }),
    );
    await renderWithProviders(<MealPlanEditPage />, {route: '/meal-plans/new'});
    fireEvent.change(screen.getByPlaceholderText('Plan title'), {
      target: {value: 'Week'},
    });
    fireEvent.click(screen.getByText('Save plan'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`/meal-plans/${PLAN_ID}`);
    });
    // The create flow creates the plan EMPTY (#646, tranche 1):
    // entries are added on the view page it lands on.
    expect(postBody).toMatchObject({title: 'Week', entries: []});
  });

  test('loads an existing plan and preserves its entries on a details save', async () => {
    let putBody: unknown = null;
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
                day: '2026-01-03',
                servingsToCook: 4,
                servingsToEat: 2,
                title: 'Test Recipe',
                imageUrl: null,
                recipeServings: 4,
                accessLost: false,
                nutrition: null,
                satietyScore: null,
                nutritionStatus: null,
                calories: null,
                proteinG: null,
                carbsG: null,
                fatG: null,
              },
            ],
          }),
        ),
      ),
      http.put(
        `http://localhost:8080/api/meal-plans/${PLAN_ID}`,
        async ({request}) => {
          putBody = await request.json();
          return HttpResponse.json(makeMealPlanDetail());
        },
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
    fireEvent.change(screen.getByPlaceholderText('Plan title'), {
      target: {value: 'Next week'},
    });
    fireEvent.click(screen.getByText('Save plan'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`/meal-plans/${PLAN_ID}`);
    });
    // The details save must not drop or alter the plan's
    // entries: quantity, divergent servings-to-eat (#363), and
    // the per-entry day (#539) all ride through untouched.
    expect(putBody).toMatchObject({
      title: 'Next week',
      entries: [
        {
          recipeId: 'recipe-uuid-1',
          quantity: 1,
          servingsToCook: 4,
          servingsToEat: 2,
          day: '2026-01-03',
        },
      ],
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

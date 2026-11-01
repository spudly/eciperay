import {queryKeys} from '@eciperay/client';
import {onlineManager} from '@tanstack/react-query';
import {act, screen, waitFor} from '@testing-library/react';
import {http, HttpResponse} from 'msw';
import {Route, Routes} from 'react-router-dom';

import {MEAL_ID} from '../test/fixtures/meal.js';
import {server} from '../test/msw/server.js';
import {makeQueryClient, renderWithProviders} from '../test/testUtils.js';

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

  test('shows a not-found state for a nonexistent meal id', async () => {
    server.use(
      http.get('http://localhost:8080/api/meals/not-a-uuid', () =>
        // Mirrors the real route since #348: a malformed meal id
        // answers 404 with {error: 'Meal not found'}.
        HttpResponse.json({error: 'Meal not found'}, {status: 404}),
      ),
    );

    await renderWithProviders(
      <Routes>
        <Route
          path="/meals/:mealId"
          element={<MealDetailPage />}
        />
      </Routes>,
      {route: '/meals/not-a-uuid'},
    );

    // #356: a settled 404 must not leave the page on Loading forever.
    await waitFor(() => {
      expect(screen.getByText('Page not found')).toBeInTheDocument();
    });
    expect(screen.queryByText('Sunday Dinner')).not.toBeInTheDocument();
  });

  test('shows a not-found state for a deleted or unknown meal', async () => {
    const missingId = '00000000-0000-4000-8000-000000000099';
    server.use(
      http.get(`http://localhost:8080/api/meals/${missingId}`, () =>
        HttpResponse.json({error: 'Meal not found'}, {status: 404}),
      ),
    );

    await renderWithProviders(
      <Routes>
        <Route
          path="/meals/:mealId"
          element={<MealDetailPage />}
        />
      </Routes>,
      {route: `/meals/${missingId}`},
    );

    await waitFor(() => {
      expect(screen.getByText('Page not found')).toBeInTheDocument();
    });
  });

  test('shows a not-found state when a refetch 404s over a cached meal', async () => {
    const queryClient = makeQueryClient();
    await renderWithProviders(
      <Routes>
        <Route
          path="/meals/:mealId"
          element={<MealDetailPage />}
        />
      </Routes>,
      {route: `/meals/${MEAL_ID}`, queryClient},
    );
    await waitFor(() => {
      expect(screen.getByText('Sunday Dinner')).toBeInTheDocument();
    });

    // The meal is deleted elsewhere; the detail refetch now answers
    // 404 while TanStack Query still holds the cached meal data.
    server.use(
      http.get(`http://localhost:8080/api/meals/${MEAL_ID}`, () =>
        HttpResponse.json({error: 'Meal not found'}, {status: 404}),
      ),
    );
    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.meal(MEAL_ID),
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Page not found')).toBeInTheDocument();
    });
    expect(screen.queryByText('Sunday Dinner')).not.toBeInTheDocument();
  });

  test('shows a generic error state when a refetch 500s over a cached meal', async () => {
    const queryClient = makeQueryClient();
    await renderWithProviders(
      <Routes>
        <Route
          path="/meals/:mealId"
          element={<MealDetailPage />}
        />
      </Routes>,
      {route: `/meals/${MEAL_ID}`, queryClient},
    );
    await waitFor(() => {
      expect(screen.getByText('Sunday Dinner')).toBeInTheDocument();
    });

    // The detail refetch now fails with a 500 while TanStack Query
    // still holds the cached meal data: the settled error wins over
    // the cached meal, mirroring the refetch-404 case above.
    server.use(
      http.get(`http://localhost:8080/api/meals/${MEAL_ID}`, () =>
        HttpResponse.json({error: 'Internal error'}, {status: 500}),
      ),
    );
    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.meal(MEAL_ID),
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
    expect(screen.queryByText('Sunday Dinner')).not.toBeInTheDocument();
    expect(screen.queryByText('Page not found')).not.toBeInTheDocument();
  });

  test('shows a generic error state when the meal fails to load', async () => {
    server.use(
      http.get(`http://localhost:8080/api/meals/${MEAL_ID}`, () =>
        HttpResponse.json({error: 'Internal error'}, {status: 500}),
      ),
    );

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
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
    expect(screen.queryByText('Page not found')).not.toBeInTheDocument();
  });

  test('stays on the loading gate while a meal fetch is paused offline', async () => {
    onlineManager.setOnline(false);
    try {
      const queryClient = makeQueryClient();
      await renderWithProviders(
        <Routes>
          <Route
            path="/meals/:mealId"
            element={<MealDetailPage />}
          />
        </Routes>,
        {route: `/meals/${MEAL_ID}`, queryClient},
      );

      // The uncached query really is paused: still pending, not settled.
      const state = queryClient.getQueryState(queryKeys.meal(MEAL_ID));
      expect(state?.status).toBe('pending');
      expect(state?.fetchStatus).toBe('paused');

      // A paused fetch has isLoading false in TanStack Query v5; the page
      // must stay on the loading gate (isPending), not render not-found
      // for a meal that may exist.
      expect(screen.queryByText('Page not found')).not.toBeInTheDocument();
      expect(screen.queryByText('Sunday Dinner')).not.toBeInTheDocument();
      await screen.findByRole('status', {name: 'Loading'});
    } finally {
      onlineManager.setOnline(true);
    }
  });
});

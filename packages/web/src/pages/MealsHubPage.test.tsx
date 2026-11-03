import {QueryClient} from '@tanstack/react-query';
import {act, fireEvent, screen, waitFor} from '@testing-library/react';
import {http, HttpResponse} from 'msw';

import {
  makeMealPlanSummary,
  makeMealSummary,
  MEAL_ID,
  PLAN_ID,
} from '../test/fixtures/meal.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {MealsHubPage} from './MealsHubPage.js';

describe('MealsHubPage', () => {
  test('renders meals from API', async () => {
    server.use(
      http.get('http://localhost:8080/api/meals', () =>
        HttpResponse.json([makeMealSummary()]),
      ),
    );
    await renderWithProviders(<MealsHubPage />);
    await waitFor(() => {
      expect(screen.getByText('Sunday Dinner')).toBeInTheDocument();
    });
    expect(screen.getByText('New meal')).toBeInTheDocument();
    // The create action navigates, so it crosses to the DS page as an
    // href and renders as a real link (#248).
    expect(screen.getByRole('link', {name: 'New meal'})).toHaveAttribute(
      'href',
      '/meals/new',
    );
  });

  test('switches tabs and handles actions', async () => {
    server.use(
      http.get('http://localhost:8080/api/meals', () =>
        HttpResponse.json([makeMealSummary()]),
      ),
      http.get('http://localhost:8080/api/meal-plans', () =>
        HttpResponse.json([makeMealPlanSummary()]),
      ),
      http.delete(
        'http://localhost:8080/api/meals/:id',
        () => new HttpResponse(null, {status: 204}),
      ),
      http.delete(
        'http://localhost:8080/api/meal-plans/:id',
        () => new HttpResponse(null, {status: 204}),
      ),
    );
    await renderWithProviders(<MealsHubPage />, {route: '/meals'});
    await waitFor(() => {
      expect(screen.getByText('Sunday Dinner')).toBeInTheDocument();
    });
    // Rows navigate, so they render as links carrying the destination.
    expect(screen.getByRole('link', {name: /Sunday Dinner/})).toHaveAttribute(
      'href',
      `/meals/${MEAL_ID}`,
    );
    await act(async () => {
      fireEvent.click(screen.getAllByText('Delete')[0]!);
    });
    await waitFor(() => {
      expect(screen.getByText('Sunday Dinner')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Meal plans'));
    });
    await waitFor(() => {
      expect(screen.getByText('This week')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', {name: 'New meal plan'})).toHaveAttribute(
      'href',
      '/meal-plans/new',
    );
    expect(screen.getByRole('link', {name: /This week/})).toHaveAttribute(
      'href',
      `/meal-plans/${PLAN_ID}`,
    );
    await act(async () => {
      fireEvent.click(screen.getAllByText('Delete')[0]!);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('tab', {name: 'Meals'}));
    });
    await waitFor(() => {
      expect(screen.getByText('Sunday Dinner')).toBeInTheDocument();
    });
  });

  test('deleting a meal plan removes its row from the list', async () => {
    let plans = [makeMealPlanSummary()];
    let deleted = false;
    let releaseRefetch: (() => void) | undefined;
    const refetchGate = new Promise<void>(resolve => {
      releaseRefetch = resolve;
    });
    server.use(
      http.get('http://localhost:8080/api/meals', () => HttpResponse.json([])),
      http.get('http://localhost:8080/api/meal-plans', async () => {
        // Hold the post-delete invalidation refetch open: the row must
        // disappear before it lands, which only the mutation's removal
        // of the plan from the cached list can do.
        if (deleted) {
          await refetchGate;
        }
        return HttpResponse.json(plans);
      }),
      http.delete('http://localhost:8080/api/meal-plans/:id', ({params}) => {
        plans = plans.filter(plan => plan.id !== params['id']);
        deleted = true;
        return new HttpResponse(null, {status: 204});
      }),
    );
    await renderWithProviders(<MealsHubPage />, {route: '/meals?tab=plans'});
    await waitFor(() => {
      expect(screen.getByText('This week')).toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: 'Delete This week'}));
    });
    await waitFor(() => {
      expect(screen.queryByText('This week')).not.toBeInTheDocument();
    });
    releaseRefetch?.();
    await waitFor(() => {
      expect(screen.getByText('No meal plans yet.')).toBeInTheDocument();
    });
  });

  test('does not show a plan deleted while the list was unmounted (#387)', async () => {
    let plans = [makeMealPlanSummary()];
    server.use(
      http.get('http://localhost:8080/api/meals', () => HttpResponse.json([])),
      http.get('http://localhost:8080/api/meal-plans', () =>
        HttpResponse.json(plans),
      ),
    );
    // The production QueryClient's settings (src/main.tsx): with a 30s
    // staleTime, a list refetched on return is the only thing standing
    // between a plan deleted elsewhere and a ghost row.
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {retry: false, staleTime: 30_000, refetchOnWindowFocus: false},
      },
    });
    const first = await renderWithProviders(<MealsHubPage />, {
      route: '/meals?tab=plans',
      queryClient,
    });
    await waitFor(() => {
      expect(screen.getByText('This week')).toBeInTheDocument();
    });
    first.unmount();

    // The plan is deleted while the list is not mounted (e.g. from its
    // detail page), so no hub mutation invalidates the cached list.
    plans = [];

    await renderWithProviders(<MealsHubPage />, {
      route: '/meals?tab=plans',
      queryClient,
    });
    await waitFor(() => {
      expect(screen.queryByText('This week')).not.toBeInTheDocument();
    });
    expect(screen.getByText('No meal plans yet.')).toBeInTheDocument();
  });
});

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
    expect(
      screen.getByRole('link', {name: /Sunday Dinner/}),
    ).toHaveAttribute('href', `/meals/${MEAL_ID}`);
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
});

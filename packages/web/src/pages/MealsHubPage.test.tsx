import {act, fireEvent, screen, waitFor} from '@testing-library/react';
import {http, HttpResponse} from 'msw';
import {vi} from 'vitest';

import {
  makeMealPlanSummary,
  makeMealSummary,
  MEAL_ID,
  PLAN_ID,
} from '../test/fixtures/meal.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {MealsHubPage} from './MealsHubPage.js';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {...actual, useNavigate: () => mockNavigate};
});

describe('MealsHubPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

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
    await act(async () => {
      fireEvent.click(screen.getByText('New meal'));
    });
    expect(mockNavigate).toHaveBeenCalledWith('/meals/new');
    await act(async () => {
      fireEvent.click(screen.getByText('Sunday Dinner'));
    });
    expect(mockNavigate).toHaveBeenCalledWith(`/meals/${MEAL_ID}`);
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
    await act(async () => {
      fireEvent.click(screen.getByText('New meal plan'));
    });
    expect(mockNavigate).toHaveBeenCalledWith('/meal-plans/new');
    await act(async () => {
      fireEvent.click(screen.getByText('This week'));
    });
    expect(mockNavigate).toHaveBeenCalledWith(`/meal-plans/${PLAN_ID}`);
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

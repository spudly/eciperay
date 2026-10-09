import {fireEvent, screen, waitFor} from '@testing-library/react';
import {http, HttpResponse} from 'msw';
import {Route, Routes} from 'react-router-dom';
import {vi} from 'vitest';

import {eciperay} from '../lib/api.js';
import {makeMealDetail, MEAL_ID} from '../test/fixtures/meal.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {MealEditPage} from './MealEditPage.js';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {...actual, useNavigate: () => mockNavigate};
});

describe('MealEditPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  test('renders new meal form', async () => {
    await renderWithProviders(<MealEditPage />);
    await waitFor(() => {
      expect(screen.getByText('Meal')).toBeInTheDocument();
    });
    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
  });

  test('creates a meal', async () => {
    server.use(
      http.post('http://localhost:8080/api/meals', async () =>
        HttpResponse.json(makeMealDetail(), {status: 201}),
      ),
    );
    await renderWithProviders(<MealEditPage />, {route: '/meals/new'});
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('Meal title'), {
      target: {value: 'Dinner'},
    });
    fireEvent.click(screen.getByText('Test Recipe'));
    fireEvent.click(screen.getByText('Save meal'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`/meals/${MEAL_ID}`);
    });
  });

  test('shows save errors', async () => {
    vi.spyOn(eciperay.meals, 'create').mockRejectedValueOnce(
      new Error('Save failed'),
    );
    await renderWithProviders(<MealEditPage />, {route: '/meals/new'});
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('Meal title'), {
      target: {value: 'Dinner'},
    });
    fireEvent.click(screen.getByText('Test Recipe'));
    fireEvent.click(screen.getByText('Save meal'));
    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeInTheDocument();
    });
  });

  test('toggles recipes and adjusts servings', async () => {
    await renderWithProviders(<MealEditPage />, {route: '/meals/new'});
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('Meal title'), {
      target: {value: 'Dinner'},
    });
    fireEvent.click(screen.getByText('Test Recipe'));
    fireEvent.click(screen.getByText('+'));
    fireEvent.click(screen.getByText('Test Recipe'));
    expect(
      screen.queryByText('Servings · Test Recipe'),
    ).not.toBeInTheDocument();
  });

  test('loads and updates an existing meal', async () => {
    server.use(
      http.get(`http://localhost:8080/api/meals/${MEAL_ID}`, () =>
        HttpResponse.json(makeMealDetail()),
      ),
      http.put(`http://localhost:8080/api/meals/${MEAL_ID}`, async () =>
        HttpResponse.json(makeMealDetail({title: 'Updated dinner'})),
      ),
    );
    await renderWithProviders(
      <Routes>
        <Route
          path="/meals/:mealId/edit"
          element={<MealEditPage />}
        />
      </Routes>,
      {route: `/meals/${MEAL_ID}/edit`},
    );
    await waitFor(() => {
      expect(screen.getByDisplayValue('Sunday Dinner')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Save meal'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`/meals/${MEAL_ID}`);
    });
  });
});

import {fireEvent, screen, waitFor} from '@testing-library/react';
import {http, HttpResponse} from 'msw';
import {Route, Routes} from 'react-router-dom';
import {vi} from 'vitest';

import {eciperay} from '../lib/api.js';
import {makeMealDetail, MEAL_ID} from '../test/fixtures/meal.js';
import {makeRecipeDetail} from '../test/fixtures/recipe.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {MealEditPage} from './MealEditPage.js';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {...actual, useNavigate: () => mockNavigate};
});

// The picker is a search autocomplete (#359): results only appear after
// typing in the search field and the debounced server search returning.
const searchFor = async (text: string, resultLabel: string) => {
  fireEvent.change(screen.getByPlaceholderText('Search recipes…'), {
    target: {value: text},
  });
  await waitFor(
    () => {
      expect(screen.getByText(resultLabel)).toBeInTheDocument();
    },
    {timeout: 5000},
  );
};

describe('MealEditPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  test('renders new meal form', async () => {
    await renderWithProviders(<MealEditPage />);
    await waitFor(() => {
      expect(screen.getByText('Meal')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('Search recipes…')).toBeInTheDocument();
    // No library is listed before a search is typed.
    expect(screen.queryByText('Test Recipe')).not.toBeInTheDocument();
  });

  test('finds recipes beyond the first 100 by searching (#359)', async () => {
    const library = Array.from({length: 101}, (_, index) =>
      makeRecipeDetail({
        id: `recipe-uuid-${index + 1}`,
        title: `Recipe ${index + 1}`,
        slug: `recipe-${index + 1}`,
      }),
    );
    const searches: string[] = [];
    server.use(
      http.get('http://localhost:8080/api/recipes', ({request}) => {
        const url = new URL(request.url);
        const search = url.searchParams.get('search') ?? '';
        searches.push(search);
        const limit = Number(url.searchParams.get('limit') ?? 20);
        // Server-side search: matches are computed from the full library,
        // so a recipe past position 100 is reachable by its title.
        const matches = search
          ? library.filter(recipe =>
              recipe.title.toLowerCase().includes(search.toLowerCase()),
            )
          : [];
        return HttpResponse.json(matches.slice(0, limit));
      }),
    );
    await renderWithProviders(<MealEditPage />, {route: '/meals/new'});
    await searchFor('Recipe 101', 'Recipe 101');
    expect(searches).toContain('Recipe 101');
    fireEvent.click(screen.getByText('Recipe 101'));
    // Selected: it leaves the results and shows its servings stepper.
    await waitFor(() => {
      expect(screen.getByText('Servings · Recipe 101')).toBeInTheDocument();
    });
  }, 30000);

  test('surfaces a recipe search failure instead of no matches', async () => {
    server.use(
      http.get('http://localhost:8080/api/recipes', () =>
        HttpResponse.json({error: 'boom'}, {status: 500}),
      ),
    );
    await renderWithProviders(<MealEditPage />, {route: '/meals/new'});
    fireEvent.change(screen.getByPlaceholderText('Search recipes…'), {
      target: {value: 'Test'},
    });
    await waitFor(
      () => {
        expect(screen.getByText(/Could not load recipes:/)).toBeInTheDocument();
      },
      {timeout: 5000},
    );
    expect(screen.queryByText('Test Recipe')).not.toBeInTheDocument();
  });

  test('creates a meal', async () => {
    server.use(
      http.post('http://localhost:8080/api/meals', async () =>
        HttpResponse.json(makeMealDetail(), {status: 201}),
      ),
    );
    await renderWithProviders(<MealEditPage />, {route: '/meals/new'});
    await searchFor('Test', 'Test Recipe');
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
    await searchFor('Test', 'Test Recipe');
    fireEvent.change(screen.getByPlaceholderText('Meal title'), {
      target: {value: 'Dinner'},
    });
    fireEvent.click(screen.getByText('Test Recipe'));
    fireEvent.click(screen.getByText('Save meal'));
    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeInTheDocument();
    });
  });

  test('selects, adjusts servings, and removes recipes', async () => {
    await renderWithProviders(<MealEditPage />, {route: '/meals/new'});
    await searchFor('Test', 'Test Recipe');
    fireEvent.change(screen.getByPlaceholderText('Meal title'), {
      target: {value: 'Dinner'},
    });
    fireEvent.click(screen.getByText('Test Recipe'));
    await waitFor(() => {
      expect(screen.getByText('Servings · Test Recipe')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+'));
    fireEvent.click(screen.getByText('Remove'));
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
    // The meal's recipe is already selected — its stepper renders without
    // any search, even though it is in no current search result.
    expect(screen.getByText('Servings · Test Recipe')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Save meal'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`/meals/${MEAL_ID}`);
    });
  });
});

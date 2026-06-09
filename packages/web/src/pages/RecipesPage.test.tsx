import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {vi} from 'vitest';

import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {RecipesPage} from './RecipesPage.js';

describe('RecipesPage', () => {
  test('shows recipe thumbnails when imageUrl is present', async () => {
    server.use(
      http.get('http://localhost:8080/recipes', () =>
        HttpResponse.json([
          {
            id: '3',
            title: 'Cake',
            servings: 8,
            cookTimeMin: 45,
            userId: 'u',
            description: null,
            prepTimeMin: null,
            imageUrl: 'https://cdn.example/cake.jpg',
            starRating: null,
            sourceUrl: null,
            createdAt: '',
            updatedAt: '',
            ingredients: [],
            instructions: [],
            tags: [],
          },
        ]),
      ),
    );
    await renderWithProviders(<RecipesPage />);
    await waitFor(() => {
      expect(screen.getByRole('img', {name: 'Cake'})).toHaveAttribute(
        'src',
        'https://cdn.example/cake.jpg',
      );
    });
  });

  test('lists recipes without cook time', async () => {
    server.use(
      http.get('http://localhost:8080/recipes', () =>
        HttpResponse.json([
          {
            id: '2',
            title: 'Salad',
            servings: 2,
            cookTimeMin: null,
            userId: 'u',
            description: null,
            prepTimeMin: null,
            imageUrl: null,
            starRating: null,
            sourceUrl: null,
            createdAt: '',
            updatedAt: '',
            ingredients: [],
            instructions: [],
            tags: [],
          },
        ]),
      ),
    );
    await renderWithProviders(<RecipesPage />);
    await waitFor(() => {
      expect(screen.getByText('Salad')).toBeInTheDocument();
    });
    expect(screen.getByText('2 servings')).toBeInTheDocument();
  });

  test('lists recipes and searches', async () => {
    await renderWithProviders(<RecipesPage />);
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    await userEvent.type(
      screen.getByPlaceholderText('Search recipes…'),
      'Nonexistent',
    );
    await waitFor(() => {
      expect(screen.getByText('No recipes found.')).toBeInTheDocument();
    });
  });

  test('deletes recipe on confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await renderWithProviders(<RecipesPage />);
    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
    server.use(
      http.get('http://localhost:8080/recipes', () => HttpResponse.json([])),
    );
    await userEvent.click(screen.getByText('Delete'));
    await waitFor(() => {
      expect(screen.queryByText('Test Recipe')).not.toBeInTheDocument();
    });
  });
});

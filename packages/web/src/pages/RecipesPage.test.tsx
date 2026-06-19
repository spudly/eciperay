import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {vi} from 'vitest';

import {makeRecipeDetail} from '../test/fixtures/recipe.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {RecipesPage} from './RecipesPage.js';

describe('RecipesPage', () => {
  test('shows recipe thumbnails when imageUrl is present', async () => {
    server.use(
      http.get('http://localhost:8080/api/recipes', () =>
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
            lifecycleStatus: 'evolving',
            versionId: 'version-1',
            versionNumber: 1,
            createdVia: 'manual',
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
      http.get('http://localhost:8080/api/recipes', () =>
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
            lifecycleStatus: 'evolving',
            versionId: 'version-1',
            versionNumber: 1,
            createdVia: 'manual',
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

  test('loads more recipes when the sentinel is visible', async () => {
    const firstPage = Array.from({length: 20}, (_, index) => ({
      id: `recipe-${index}`,
      title: `Recipe ${index}`,
      servings: 4,
      cookTimeMin: null,
      userId: 'u',
      description: null,
      prepTimeMin: null,
      imageUrl: null,
      lifecycleStatus: 'evolving' as const,
      versionId: 'version-1',
      versionNumber: 1,
      createdVia: 'manual' as const,
      sourceUrl: null,
      createdAt: '',
      updatedAt: '',
      ingredients: [],
      instructions: [],
      tags: [],
    }));
    server.use(
      http.get('http://localhost:8080/api/recipes', ({request}) => {
        const offset = Number(
          new URL(request.url).searchParams.get('offset') ?? 0,
        );
        if (offset === 0) {
          return HttpResponse.json(firstPage);
        }
        return HttpResponse.json([
          {
            id: 'recipe-20',
            title: 'Recipe 20',
            servings: 4,
            cookTimeMin: null,
            userId: 'u',
            description: null,
            prepTimeMin: null,
            imageUrl: null,
            lifecycleStatus: 'evolving',
            versionId: 'version-1',
            versionNumber: 1,
            createdVia: 'manual',
            sourceUrl: null,
            createdAt: '',
            updatedAt: '',
            ingredients: [],
            instructions: [],
            tags: [],
          },
        ]);
      }),
    );
    const observers: IntersectionObserverCallback[] = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          observers.push(callback);
        }
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
    await renderWithProviders(<RecipesPage />);
    await waitFor(() => {
      expect(screen.getByText('Recipe 0')).toBeInTheDocument();
    });
    observers.at(-1)?.(
      [{isIntersecting: true}] as IntersectionObserverEntry[],
      {} as IntersectionObserver,
    );
    await waitFor(() => {
      expect(screen.getByText('Recipe 20')).toBeInTheDocument();
    });
  });

  test('deletes recipe on confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await renderWithProviders(<RecipesPage />);
    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
    server.use(
      http.get('http://localhost:8080/api/recipes', () =>
        HttpResponse.json([]),
      ),
    );
    await userEvent.click(screen.getByText('Delete'));
    await waitFor(() => {
      expect(screen.queryByText('Test Recipe')).not.toBeInTheDocument();
    });
  });

  test('removes deleted recipe from filtered list without clearing search', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    let deleted = false;
    const soup = makeRecipeDetail({id: 'soup-id', title: 'Soup'});
    const salad = makeRecipeDetail({id: 'salad-id', title: 'Salad'});
    server.use(
      http.get('http://localhost:8080/api/recipes', ({request}) => {
        const url = new URL(request.url);
        const search = url.searchParams.get('search')?.trim();
        const items = [soup, salad].filter(
          recipe => !deleted || recipe.id !== 'soup-id',
        );
        if (search) {
          return HttpResponse.json(
            items.filter(recipe =>
              recipe.title.toLowerCase().includes(search.toLowerCase()),
            ),
          );
        }
        return HttpResponse.json(items);
      }),
      http.delete('http://localhost:8080/api/recipes/:id', () => {
        deleted = true;
        return new HttpResponse(null, {status: 204});
      }),
    );
    await renderWithProviders(<RecipesPage />);
    await waitFor(() => {
      expect(screen.getByText('Soup')).toBeInTheDocument();
    });
    await userEvent.type(
      screen.getByPlaceholderText('Search recipes…'),
      'Soup',
    );
    await waitFor(() => {
      expect(screen.getByText('Soup')).toBeInTheDocument();
      expect(screen.queryByText('Salad')).not.toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Delete'));
    await waitFor(() => {
      expect(screen.queryByText('Soup')).not.toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('Search recipes…')).toHaveValue('Soup');
  });
});

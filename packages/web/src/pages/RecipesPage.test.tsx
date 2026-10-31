import {act, fireEvent, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';

import {makeCookLog, makeRecipeDetail} from '../test/fixtures/recipe.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {RecipesPage} from './RecipesPage.js';

// The host renders the design system's RecipesPage (B7 cluster 5);
// these tests drive that page's real DOM: rows are links named for
// the recipe (the text block's name carries the subtitle), the
// log-cook control is the row's rating stars (or a single star
// button when unrated), and the filters sit behind the page's
// "Add a filter" chooser until added.
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
            status: 'evolving',
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
    const {container} = await renderWithProviders(<RecipesPage />);
    await waitFor(() => {
      expect(
        container.querySelector('img[src="https://cdn.example/cake.jpg"]'),
      ).not.toBeNull();
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
            status: 'evolving',
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
    expect(screen.getByText(/2 servings/)).toBeInTheDocument();
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

  // Pagination is the DS page's end-reached signal now (its FlatList
  // fires onLoadMore when scrolled to the end); jsdom has no layout,
  // so the signal cannot be driven here — the browser-level flow is
  // covered by the Playwright e2e pagination case. What this host
  // owns, and what is pinned here, is that the first page renders
  // and no further page is fetched until that signal arrives.
  test('renders the first page without fetching the next one unprompted', async () => {
    const firstPage = Array.from({length: 20}, (_, index) => ({
      id: `recipe-${index}`,
      title: `Recipe ${index}`,
      servings: 4,
      cookTimeMin: null,
      userId: 'u',
      description: null,
      prepTimeMin: null,
      imageUrl: null,
      status: 'evolving' as const,
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
    let callCount = 0;
    server.use(
      http.get('http://localhost:8080/api/recipes', ({request}) => {
        const offset = Number(
          new URL(request.url).searchParams.get('offset') ?? 0,
        );
        callCount += 1;
        if (offset === 0) {
          return HttpResponse.json(firstPage);
        }
        return HttpResponse.json([]);
      }),
    );
    await renderWithProviders(<RecipesPage />);
    await waitFor(() => {
      expect(screen.getByText('Recipe 0')).toBeInTheDocument();
    });
    // Let any unprompted fetch settle out, then check none happened.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
    });
    expect(callCount).toBe(1);
  });

  // Deleting a recipe is a recipe-detail action in the DS page's
  // contract (the app adopted the same in @spudly/ui 1.8.0): the
  // list rows offer no Delete. Delete itself — including the
  // never-silent failure handling (#263) — is covered on the detail
  // page's tests.
  test('rows offer no delete control', async () => {
    await renderWithProviders(<RecipesPage />);
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    expect(screen.queryByText('Confirm delete')).not.toBeInTheDocument();
  });

  test('links each row to its recipe detail', async () => {
    await renderWithProviders(<RecipesPage />);
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    // The row is a real link whose href is the detail route (#248):
    // the host builds it when it maps the item, and the page renders
    // the link itself — there is no row press to forward.
    expect(screen.getByRole('link', {name: /^Test Recipe, /})).toHaveAttribute(
      'href',
      '/recipes/recipe-uuid-1',
    );
  });

  test('logs a cook from the row without opening the recipe', async () => {
    // Capture the create request: the host maps the DS form's `rating`
    // onto the cook log's `authorStarRating` at this boundary, and a
    // regression in that mapping must fail here, not just the close.
    let postedBody: unknown;
    server.use(
      http.post(
        'http://localhost:8080/api/recipes/:id/versions/:versionId/cooks',
        async ({request}) => {
          postedBody = await request.json();
          return HttpResponse.json(
            {...makeCookLog(), ...(postedBody as object)},
            {status: 201},
          );
        },
      ),
    );
    await renderWithProviders(<RecipesPage />);
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    await userEvent.click(
      screen.getByRole('button', {name: 'Log a cook of Test Recipe'}),
    );
    // The inline form opens in the row, in place of the log-cook
    // control (the page hides the control while the row's accessory
    // renders content).
    await waitFor(() => {
      expect(screen.getByText('How did it go?')).toBeInTheDocument();
    });
    await userEvent.click(
      screen.getByRole('radio', {name: 'Rate 4 out of 5 stars'}),
    );
    await userEvent.type(
      screen.getByPlaceholderText('Notes from this cook (optional)'),
      'Weeknight favorite',
    );
    await userEvent.click(screen.getByRole('button', {name: 'Save'}));
    await waitFor(() => {
      expect(screen.queryByText('How did it go?')).not.toBeInTheDocument();
    });
    expect(postedBody).toEqual({
      authorStarRating: 4,
      notes: 'Weeknight favorite',
    });
  });

  test('filters recipes by status', async () => {
    const perfected = makeRecipeDetail({
      id: 'perfected-id',
      title: 'Perfected Soup',
      status: 'perfected',
    });
    const idea = makeRecipeDetail({
      id: 'idea-id',
      title: 'Idea Soup',
      status: 'idea',
    });
    server.use(
      http.get('http://localhost:8080/api/recipes', ({request}) => {
        const status = new URL(request.url).searchParams.get('status');
        const items = [perfected, idea];
        if (status) {
          return HttpResponse.json(
            items.filter(recipe => recipe.status === status),
          );
        }
        return HttpResponse.json(items);
      }),
    );
    const user = userEvent.setup();
    await renderWithProviders(<RecipesPage />);
    await waitFor(() => {
      expect(screen.getByText('Perfected Soup')).toBeInTheDocument();
      expect(screen.getByText('Idea Soup')).toBeInTheDocument();
    });
    // The status control renders only once its filter is added from
    // the page's filter chooser.
    await user.click(screen.getByRole('button', {name: 'Add a filter'}));
    await user.click(screen.getByRole('button', {name: 'Add Status filter'}));
    await user.click(await screen.findByRole('combobox'));
    // The DS select's options carry pointer-events: none under
    // jsdom's CSS handling, so user-event's pointer checks reject
    // the click; fireEvent dispatches the same click directly.
    fireEvent.click(await screen.findByRole('option', {name: 'Perfected'}));
    await waitFor(() => {
      expect(screen.getByText('Perfected Soup')).toBeInTheDocument();
      expect(screen.queryByText('Idea Soup')).not.toBeInTheDocument();
    });
  });
});

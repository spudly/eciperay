import {act, fireEvent, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {StrictMode} from 'react';

import {Route, Routes, useNavigate} from 'react-router-dom';

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
    // Capture the create request: the accessory is the host's
    // CookLogForm (@spudly/ui 6.x has no RatingForm), whose submit
    // values are already a CookLogInput — a regression in the posted
    // body must fail here, not just the close.
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
    await userEvent.click(screen.getByLabelText('4 stars'));
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

  // The retired list view rendered the screen's heading itself; the
  // DS page renders none, so the host restores it — heading
  // navigation must be able to identify the screen.
  test('renders the Recipes page heading', async () => {
    await renderWithProviders(<RecipesPage />);
    expect(screen.getByRole('heading', {name: 'Recipes'})).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
  });

  // The web app renders under StrictMode (src/main.tsx), whose
  // development effect replay — setup, cleanup, setup on one mount —
  // must not reconcile an opened cook-log form away: the form's
  // unmount cleanup defers its close a tick and the replayed setup
  // cancels it. Without the cancellation the form closes itself as
  // soon as it opens.
  test('an opened cook-log form survives StrictMode effect replay', async () => {
    await renderWithProviders(
      <StrictMode>
        <RecipesPage />
      </StrictMode>,
    );
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    await userEvent.click(
      screen.getByRole('button', {name: 'Log a cook of Test Recipe'}),
    );
    await waitFor(() => {
      expect(screen.getByText('How did it go?')).toBeInTheDocument();
    });
    // Let the deferred reconcile tick elapse; a close scheduled by
    // the replay's cleanup and not cancelled would have fired by now.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    expect(screen.getByText('How did it go?')).toBeInTheDocument();
  });

  // A row that leaves the list unmounts its open form; the form's
  // deferred cleanup reconciles the lifted open set, so when the
  // recipe returns it comes back closed (the pre-adoption cards got
  // this for free when the card unmounted).
  test('a row that leaves and returns comes back with its form closed', async () => {
    await renderWithProviders(<RecipesPage />);
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    await userEvent.click(
      screen.getByRole('button', {name: 'Log a cook of Test Recipe'}),
    );
    await waitFor(() => {
      expect(screen.getByText('How did it go?')).toBeInTheDocument();
    });
    await userEvent.type(
      screen.getByPlaceholderText('Search recipes…'),
      'Nonexistent',
    );
    await waitFor(() => {
      expect(screen.getByText('No recipes found.')).toBeInTheDocument();
    });
    await userEvent.clear(screen.getByPlaceholderText('Search recipes…'));
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    expect(screen.queryByText('How did it go?')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', {name: 'Log a cook of Test Recipe'}),
    ).toBeInTheDocument();
  });

  // A save that completes after its form was replaced must not
  // close the replacement: the first form's success close is guarded
  // by its own mounted lifetime, while invalidation still runs. Here
  // the first form's row leaves and returns while its save is in
  // flight, a fresh form opens, and only then does the first save
  // resolve.
  test('a save completing after its form was replaced does not close the replacement', async () => {
    let resolveCreate: (() => void) | undefined;
    const createGate = new Promise<void>(resolve => {
      resolveCreate = () => {
        resolve();
      };
    });
    server.use(
      http.post(
        'http://localhost:8080/api/recipes/:id/versions/:versionId/cooks',
        async () => {
          await createGate;
          return HttpResponse.json({...makeCookLog()}, {status: 201});
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
    await waitFor(() => {
      expect(screen.getByText('How did it go?')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByLabelText('4 stars'));
    await userEvent.click(screen.getByRole('button', {name: 'Save'}));
    // The row leaves (its pending form unmounts with it) and returns.
    await userEvent.type(
      screen.getByPlaceholderText('Search recipes…'),
      'Nonexistent',
    );
    await waitFor(() => {
      expect(screen.getByText('No recipes found.')).toBeInTheDocument();
    });
    await userEvent.clear(screen.getByPlaceholderText('Search recipes…'));
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    // The replacement form opens.
    await userEvent.click(
      screen.getByRole('button', {name: 'Log a cook of Test Recipe'}),
    );
    await waitFor(() => {
      expect(screen.getByText('How did it go?')).toBeInTheDocument();
    });
    // The first save now completes; its guarded close must not
    // reach the replacement form.
    await act(async () => {
      resolveCreate?.();
    });
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    expect(screen.getByText('How did it go?')).toBeInTheDocument();
  });

  // While a save is in flight, Skip is inert (the host guards the
  // form's skip callback with the mutation's pending state): closing
  // then would orphan the request and let a reopened form save a
  // duplicate. The save's own success path closes the form when it
  // lands.
  test('skip does not close the form while its save is pending', async () => {
    let resolveCreate: (() => void) | undefined;
    const createGate = new Promise<void>(resolve => {
      resolveCreate = () => {
        resolve();
      };
    });
    server.use(
      http.post(
        'http://localhost:8080/api/recipes/:id/versions/:versionId/cooks',
        async () => {
          await createGate;
          return HttpResponse.json({...makeCookLog()}, {status: 201});
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
    await waitFor(() => {
      expect(screen.getByText('How did it go?')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByLabelText('4 stars'));
    await userEvent.click(screen.getByRole('button', {name: 'Save'}));
    // Let the save get fully in flight (the create handler is
    // gated on the promise above), then try to skip out of it.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });
    await userEvent.click(screen.getByRole('button', {name: 'Skip'}));
    expect(screen.getByText('How did it go?')).toBeInTheDocument();
    // When the save lands, its success path closes the form.
    await act(async () => {
      resolveCreate?.();
    });
    await waitFor(() => {
      expect(screen.queryByText('How did it go?')).not.toBeInTheDocument();
    });
  });

  // The unified browse (#409): one page carries the user's own
  // recipes, the recipes shared with them (badged, in the own
  // section), and the public discovery catalog (its own section).
  test('unifies own, shared and discovery recipes on one page', async () => {
    const {container} = await renderWithProviders(<RecipesPage />);
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    // Shared-with-me row: badged in the own section, linking to the
    // shared recipe's public permalink.
    await waitFor(() => {
      expect(
        container.querySelector(
          'a[href="/recipe/shared-recipe-1/shared-pasta"]',
        ),
      ).not.toBeNull();
    });
    expect(screen.getByText('Shared')).toBeInTheDocument();
    // Discovery row: the public catalog item, linking to its public
    // permalink under its own id.
    await waitFor(() => {
      expect(
        container.querySelector(
          'a[href="/recipe/public-recipe-1/shared-pasta"]',
        ),
      ).not.toBeNull();
    });
    expect(screen.getByText('Your recipes')).toBeInTheDocument();
    expect(screen.getByText('Discover')).toBeInTheDocument();
  });

  test('shared rows offer no log-cook form', async () => {
    await renderWithProviders(<RecipesPage />);
    await waitFor(() => {
      expect(screen.getByText('Shared')).toBeInTheDocument();
    });
    await userEvent.click(
      screen.getByRole('button', {name: 'Log a cook of Shared Pasta'}),
    );
    // Cook logs are owner-only: the press is ignored for shared rows
    // and no cook-log form opens.
    expect(screen.queryByText('How did it go?')).not.toBeInTheDocument();
  });

  test('seeds the search from the header search q param', async () => {
    await renderWithProviders(<RecipesPage />, {route: '/recipes?q=Test'});
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search recipes…')).toHaveValue(
        'Test',
      );
    });
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
  });

  test('seeds filters from location state saved by an earlier visit (#468)', async () => {
    await renderWithProviders(<RecipesPage />, {
      routerProps: {
        initialEntries: [
          {pathname: '/recipes', state: {recipeListFilters: {search: 'Test'}}},
        ],
      },
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search recipes…')).toHaveValue(
        'Test',
      );
    });
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
  });

  test('restores filters on Back and keeps filter edits out of the history stack (#468)', async () => {
    const BackButton = () => {
      const navigate = useNavigate();
      return (
        <>
          <button
            type="button"
            onClick={() => {
              void navigate(-1);
            }}
          >
            Go back
          </button>
          <button
            type="button"
            onClick={() => {
              void navigate('/recipes/recipe-uuid-1');
            }}
          >
            Open recipe
          </button>
        </>
      );
    };
    await renderWithProviders(
      <>
        <BackButton />
        <Routes>
          <Route
            path="/other"
            element={<p>Other page</p>}
          />
          <Route
            path="/recipes"
            element={<RecipesPage />}
          />
          <Route
            path="/recipes/:id"
            element={<p>Recipe detail</p>}
          />
        </Routes>
      </>,
      {routerProps: {initialEntries: ['/other', '/recipes'], initialIndex: 1}},
    );
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
    // Several keystrokes of filter edits: each is written to the
    // current entry's location state with replace, never a push.
    await userEvent.type(
      screen.getByPlaceholderText('Search recipes…'),
      'Test',
    );
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search recipes…')).toHaveValue(
        'Test',
      );
    });
    // Leave for a recipe (a push, as the row link performs), then go
    // Back: the browse remounts seeded from the entry's saved state.
    await userEvent.click(screen.getByRole('button', {name: 'Open recipe'}));
    await waitFor(() => {
      expect(screen.getByText('Recipe detail')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', {name: 'Go back'}));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search recipes…')).toHaveValue(
        'Test',
      );
    });
    // One more Back leaves the browse entirely — the filter edits
    // added no history entries of their own.
    await userEvent.click(screen.getByRole('button', {name: 'Go back'}));
    await waitFor(() => {
      expect(screen.getByText('Other page')).toBeInTheDocument();
    });
  });

  test('clearing the header search clears the page filter', async () => {
    const ClearHeaderSearch = () => {
      const navigate = useNavigate();
      return (
        <button
          type="button"
          onClick={() => {
            void navigate('/recipes');
          }}
        >
          Clear header search
        </button>
      );
    };
    await renderWithProviders(
      <Routes>
        <Route
          path="/recipes"
          element={
            <>
              <ClearHeaderSearch />
              <RecipesPage />
            </>
          }
        />
      </Routes>,
      {route: '/recipes?q=Shared'},
    );
    // Seeded from the header search: the filter holds the term and
    // the unfiltered own recipe is filtered out.
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search recipes…')).toHaveValue(
        'Shared',
      );
    });
    expect(screen.queryByText('Test Recipe')).not.toBeInTheDocument();
    // The header search clearing navigates to bare /recipes; the
    // page filter follows the URL and clears with it.
    await userEvent.click(
      screen.getByRole('button', {name: 'Clear header search'}),
    );
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search recipes…')).toHaveValue('');
    });
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
  });
});

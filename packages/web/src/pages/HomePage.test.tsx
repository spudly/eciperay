import {recordRecipeView} from '@eciperay/client';
import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {vi} from 'vitest';

import {recipeViewHistoryStorage} from '../lib/recipeViewHistoryStorage.js';
import {makeCookLog} from '../test/fixtures/recipe.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {HomePage} from './HomePage.js';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {...actual, useNavigate: () => mockNavigate};
});

describe('HomePage', () => {
  beforeEach(async () => {
    localStorage.clear();
    mockNavigate.mockReset();
  });

  test('renders welcome, actions, and recently viewed section', async () => {
    await renderWithProviders(<HomePage />);
    expect(screen.getByText('Welcome to Eciperay')).toBeInTheDocument();
    expect(screen.getByText('Browse Recipes')).toBeInTheDocument();
    expect(screen.getByText('Shared with me')).toBeInTheDocument();
    expect(screen.getByText('Recently viewed')).toBeInTheDocument();
    expect(
      screen.getByText('Nothing here yet — recipes you peek at will line up here for next time.'),
    ).toBeInTheDocument();
  });

  test('renders the title from the en-XA Lingui catalog (#465)', async () => {
    await renderWithProviders(<HomePage />, {locale: 'en-XA'});
    expect(screen.getByText('Welcome to Eciperay~')).toBeInTheDocument();
  });

  test('shows recently viewed recipes from local history', async () => {
    await recordRecipeView(recipeViewHistoryStorage, 'recipe-uuid-1');
    await renderWithProviders(<HomePage />);
    expect(await screen.findByText('Test Recipe')).toBeInTheDocument();
  });

  test('logs a cook from a recently viewed recipe card', async () => {
    let submittedBody: unknown;
    server.use(
      http.post(
        'http://localhost:8080/api/recipes/:id/versions/:versionId/cooks',
        async ({request}) => {
          submittedBody = await request.json();
          return HttpResponse.json(makeCookLog(), {status: 201});
        },
      ),
    );
    await recordRecipeView(recipeViewHistoryStorage, 'recipe-uuid-1');
    await renderWithProviders(<HomePage />);
    await screen.findByText('Test Recipe');
    // The DS shared row's log-cook control is its stars (#532): an
    // unrated recipe gets the icon-only button carrying this label.
    await userEvent.click(
      screen.getByRole('button', {name: 'Log a cook of Test Recipe'}),
    );
    expect(await screen.findByText('How did it go?')).toBeInTheDocument();
    // The star rating IS clicked here: since the @spudly/ui 6.x
    // migration the cook-log form is host-side and its stars are the
    // host StarRatingInput's buttons, labelled "N stars".
    await userEvent.click(screen.getByLabelText('4 stars'));
    await userEvent.type(
      screen.getByPlaceholderText('Notes from this cook — what worked, what to change next time (optional)'),
      'Great',
    );
    await userEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(screen.queryByText('How did it go?')).not.toBeInTheDocument();
    });
    // The create mutation must carry the typed notes and the clicked
    // rating — a regression that drops either must fail here, not
    // just one that leaves the form open.
    expect(submittedBody).toEqual({authorStarRating: 4, notes: 'Great'});
  });

  test('offers no delete control on recently viewed rows (#532)', async () => {
    await recordRecipeView(recipeViewHistoryStorage, 'recipe-uuid-1');
    await renderWithProviders(<HomePage />);
    await screen.findByText('Test Recipe');
    // Delete lives on the recipe details page only (Stephen,
    // 2026-10-24): the shared DS row renders no delete control.
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  test('navigates from home actions and recently viewed recipes', async () => {
    await recordRecipeView(recipeViewHistoryStorage, 'recipe-uuid-1');
    await renderWithProviders(<HomePage />);
    // The three page actions are real links since the @spudly/ui 1.15
    // navigation rework (design-system#248): assert their destinations
    // rather than a navigate() call.
    // Shared-with-me lives on the unified Recipes browse (#409): the
    // home action keeps its label and lands on /recipes.
    expect(screen.getByRole('link', {name: 'Shared with me'})).toHaveAttribute(
      'href',
      '/recipes',
    );
    expect(screen.getByRole('link', {name: 'Browse Recipes'})).toHaveAttribute(
      'href',
      '/recipes',
    );
    expect(screen.getByRole('link', {name: 'Add Recipe'})).toHaveAttribute(
      'href',
      '/add',
    );
    // Recently-viewed rows are real links to the recipe (#532, the
    // shared DS row), not host navigate() buttons.
    // Both of the row's targets (thumbnail and text block) render
    // as links carrying the recipe href.
    const rowLinks = screen.getAllByRole('link', {name: /Test Recipe/i});
    expect(rowLinks.length).toBeGreaterThan(0);
    for (const link of rowLinks) {
      expect(link).toHaveAttribute(
        'href',
        '/recipes/recipe-uuid-1/test-recipe',
      );
    }
  });
});

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
      screen.getByText('Recipes you view will appear here.'),
    ).toBeInTheDocument();
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
    await userEvent.click(screen.getByText('Log cook'));
    expect(await screen.findByText('How did it go?')).toBeInTheDocument();
    // The star rating is not clicked here: @spudly/ui 1.13.0 renders
    // the DS StarRatingInput's label as a raw accessibilitylabel
    // attribute on web (the leak design-system#237 fixes in a later
    // release), so there is no role/label to query yet. The rating is
    // optional — submitting without it sends a null rating, which
    // still exercises the card's create mutation end to end.
    await userEvent.type(
      screen.getByPlaceholderText('Notes from this cook (optional)'),
      'Great',
    );
    await userEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(screen.queryByText('How did it go?')).not.toBeInTheDocument();
    });
    // The create mutation must carry the typed notes and a null rating
    // (rating omitted by the user) — a regression that drops either
    // must fail here, not just one that leaves the form open.
    expect(submittedBody).toEqual({authorStarRating: null, notes: 'Great'});
  });

  test('deletes a recently viewed recipe on confirm', async () => {
    await recordRecipeView(recipeViewHistoryStorage, 'recipe-uuid-1');
    await renderWithProviders(<HomePage />);
    await screen.findByText('Test Recipe');
    await userEvent.click(screen.getByText('Delete'));
    await userEvent.click(screen.getByText('Confirm delete'));
    await waitFor(() => {
      expect(screen.queryByText('Test Recipe')).not.toBeInTheDocument();
    });
    expect(
      screen.getByText('Recipes you view will appear here.'),
    ).toBeInTheDocument();
  });

  test('navigates from home actions and recently viewed recipes', async () => {
    await recordRecipeView(recipeViewHistoryStorage, 'recipe-uuid-1');
    await renderWithProviders(<HomePage />);
    await userEvent.click(screen.getByText('Shared with me'));
    expect(mockNavigate).toHaveBeenCalledWith('/shared-with-me');
    await userEvent.click(screen.getByText('Browse Recipes'));
    expect(mockNavigate).toHaveBeenCalledWith('/recipes');
    await userEvent.click(screen.getByText('Add Recipe'));
    expect(mockNavigate).toHaveBeenCalledWith('/add');
    await userEvent.click(screen.getByRole('button', {name: /Test Recipe/i}));
    expect(mockNavigate).toHaveBeenCalledWith('/recipes/recipe-uuid-1');
  });
});

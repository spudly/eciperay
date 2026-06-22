import {SAVE_RECIPE_COPY_LABEL} from '@eciperay/client';
import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {vi} from 'vitest';

import {makeRecipeDetail} from '../../test/fixtures/recipe.js';
import {server} from '../../test/msw/server.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {PublicRecipeCtas} from './PublicRecipeCtas.js';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {...actual, useNavigate: () => mockNavigate};
});

describe('PublicRecipeCtas', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  test('renders signup, clone, and install links when signed out', async () => {
    await renderWithProviders(<PublicRecipeCtas recipeId="recipe-uuid-1" />, {
      withAuth: false,
    });

    expect(screen.getByRole('link', {name: 'Sign up free'})).toHaveAttribute(
      'href',
      '/signup',
    );
    expect(
      screen.getByRole('link', {name: 'Clone this recipe'}),
    ).toHaveAttribute('href', '/signup?cloneRecipe=recipe-uuid-1');
  });

  test('saves a copy when signed in', async () => {
    server.use(
      http.post('http://localhost:8080/api/recipes/recipe-uuid-1/clone', () =>
        HttpResponse.json(
          {
            ...makeRecipeDetail({
              id: 'cloned-recipe-id',
              clonedFromRecipeId: 'recipe-uuid-1',
            }),
            recipeId: 'cloned-recipe-id',
            versionId: 'version-cloned',
          },
          {status: 201},
        ),
      ),
    );

    await renderWithProviders(
      <PublicRecipeCtas
        recipeId="recipe-uuid-1"
        shareToken="share-token"
      />,
      {withAuth: true},
    );

    await userEvent.click(
      screen.getByRole('button', {name: SAVE_RECIPE_COPY_LABEL}),
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/recipes/cloned-recipe-id');
    });
  });
});

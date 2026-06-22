import {screen} from '@testing-library/react';

import {makeRecipeDetail} from '../../test/fixtures/recipe.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {PublicRecipeOverview} from './PublicRecipeOverview.js';

describe('PublicRecipeOverview', () => {
  test('renders read-only recipe overview fields', async () => {
    const recipe = makeRecipeDetail({
      title: 'Public Pasta',
      description: 'Shared recipe',
      imageUrl: 'https://cdn.example/pasta.jpg',
      prepTimeMin: 10,
      cookTimeMin: 20,
    });
    const {userId: _userId, ...publicRecipe} = recipe;
    void _userId;

    await renderWithProviders(<PublicRecipeOverview recipe={publicRecipe} />, {
      withAuth: false,
    });

    expect(screen.getByRole('img', {name: 'Public Pasta'})).toHaveAttribute(
      'src',
      'https://cdn.example/pasta.jpg',
    );
    expect(screen.getByText('Public Pasta')).toBeInTheDocument();
    expect(screen.getByText('Shared recipe')).toBeInTheDocument();
    expect(screen.getByText('10m')).toBeInTheDocument();
    expect(screen.getByText('20m')).toBeInTheDocument();
    expect(screen.getByText('Dinner')).toBeInTheDocument();
    expect(screen.queryByRole('link', {name: 'Edit'})).not.toBeInTheDocument();
  });

  test('omits optional overview fields when absent', async () => {
    const recipe = makeRecipeDetail({
      description: null,
      imageUrl: null,
      prepTimeMin: null,
      cookTimeMin: null,
      tags: [],
    });
    const {userId: _userId, ...publicRecipe} = recipe;
    void _userId;

    await renderWithProviders(<PublicRecipeOverview recipe={publicRecipe} />, {
      withAuth: false,
    });

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByText(/Prep/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cook/)).not.toBeInTheDocument();
  });
});

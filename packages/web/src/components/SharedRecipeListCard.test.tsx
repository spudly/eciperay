import {screen} from '@testing-library/react';

import {makeRecipeDetail} from '../test/fixtures/recipe.js';
import {renderWithProviders} from '../test/testUtils.js';

import {SharedRecipeListCard} from './SharedRecipeListCard.js';

describe('SharedRecipeListCard', () => {
  test('links to the public recipe page', async () => {
    const recipe = makeRecipeDetail({
      id: 'recipe-1',
      slug: 'my-recipe',
      title: 'My Recipe',
      servings: 6,
      cookTimeMin: 40,
    });
    await renderWithProviders(<SharedRecipeListCard recipe={recipe} />);
    const link = screen.getByRole('link', {name: /My Recipe/i});
    expect(link).toHaveAttribute('href', '/recipe/recipe-1/my-recipe');
    expect(
      screen.getByText(/6 servings · 40 min · .+ · Satiety/),
    ).toBeInTheDocument();
  });

  test('uses the singular for a 1-serving recipe (#278)', async () => {
    const recipe = makeRecipeDetail({
      title: 'Solo Soup',
      cookTimeMin: null,
      servings: 1,
    });
    await renderWithProviders(<SharedRecipeListCard recipe={recipe} />);
    expect(screen.getByText(/^1 serving · /)).toBeInTheDocument();
    expect(screen.queryByText(/1 servings/)).not.toBeInTheDocument();
  });

  test('omits cook time when absent', async () => {
    const recipe = makeRecipeDetail({
      title: 'Salad',
      cookTimeMin: null,
      servings: 2,
    });
    await renderWithProviders(<SharedRecipeListCard recipe={recipe} />);
    expect(screen.getByText(/^2 servings · /)).toBeInTheDocument();
    expect(screen.queryByText(/min/)).not.toBeInTheDocument();
  });

  test('shows recipe thumbnail when imageUrl is present', async () => {
    const recipe = makeRecipeDetail({
      title: 'Cake',
      imageUrl: 'https://cdn.example/cake.jpg',
    });
    await renderWithProviders(<SharedRecipeListCard recipe={recipe} />);
    expect(screen.getByRole('img', {name: 'Cake'})).toHaveAttribute(
      'src',
      'https://cdn.example/cake.jpg',
    );
  });
});

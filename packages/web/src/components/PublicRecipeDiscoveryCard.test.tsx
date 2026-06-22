import type {PublicRecipeDiscoveryItem} from '@eciperay/types';
import {DISCOVER_NO_RATINGS_LABEL} from '@eciperay/client';
import {screen} from '@testing-library/react';

import {renderWithProviders} from '../test/testUtils.js';

import {PublicRecipeDiscoveryCard} from './PublicRecipeDiscoveryCard.js';

const makeDiscoveryItem = (
  overrides: Partial<PublicRecipeDiscoveryItem> = {},
): PublicRecipeDiscoveryItem => ({
  id: 'recipe-1',
  slug: 'my-recipe',
  title: 'My Recipe',
  description: null,
  servings: 4,
  prepTimeMin: null,
  cookTimeMin: null,
  imageUrl: null,
  visibility: 'public',
  authorDisplayName: 'Chef Alex',
  updatedAt: '2024-01-01T00:00:00.000Z',
  tags: [],
  ...overrides,
});

describe('PublicRecipeDiscoveryCard', () => {
  test('links to the public recipe page with author and rating placeholder', async () => {
    const recipe = makeDiscoveryItem();
    await renderWithProviders(<PublicRecipeDiscoveryCard recipe={recipe} />);
    const link = screen.getByRole('link', {name: /My Recipe/i});
    expect(link).toHaveAttribute('href', '/recipe/recipe-1/my-recipe');
    expect(screen.getByText('By Chef Alex')).toBeInTheDocument();
    expect(screen.getByText(DISCOVER_NO_RATINGS_LABEL)).toBeInTheDocument();
  });

  test('shows anonymous author when display name is missing', async () => {
    const recipe = makeDiscoveryItem({authorDisplayName: null});
    await renderWithProviders(<PublicRecipeDiscoveryCard recipe={recipe} />);
    expect(screen.getByText('By Anonymous')).toBeInTheDocument();
  });

  test('shows anonymous author when display name is blank', async () => {
    const recipe = makeDiscoveryItem({authorDisplayName: '   '});
    await renderWithProviders(<PublicRecipeDiscoveryCard recipe={recipe} />);
    expect(screen.getByText('By Anonymous')).toBeInTheDocument();
  });

  test('shows recipe thumbnail when imageUrl is present', async () => {
    const recipe = makeDiscoveryItem({
      title: 'Cake',
      imageUrl: 'https://cdn.example/cake.jpg',
    });
    await renderWithProviders(<PublicRecipeDiscoveryCard recipe={recipe} />);
    expect(screen.getByRole('img', {name: 'Cake'})).toHaveAttribute(
      'src',
      'https://cdn.example/cake.jpg',
    );
  });
});

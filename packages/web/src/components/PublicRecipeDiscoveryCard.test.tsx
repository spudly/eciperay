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
  communityRating: null,
  satietyScore: null,
  nutritionStatus: null,
  calories: null,
  proteinG: null,
  ...overrides,
});

describe('PublicRecipeDiscoveryCard', () => {
  test('links to the public recipe page with author, rating, and satiety', async () => {
    const recipe = makeDiscoveryItem();
    await renderWithProviders(<PublicRecipeDiscoveryCard recipe={recipe} />);
    const link = screen.getByRole('link', {name: /My Recipe/i});
    expect(link).toHaveAttribute('href', '/recipe/recipe-1/my-recipe');
    expect(
      screen.getByText(
        new RegExp(`By Chef Alex · ${DISCOVER_NO_RATINGS_LABEL}`),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Satiety —/)).toBeInTheDocument();
  });

  test('shows anonymous author when display name is missing', async () => {
    const recipe = makeDiscoveryItem({authorDisplayName: null});
    await renderWithProviders(<PublicRecipeDiscoveryCard recipe={recipe} />);
    expect(screen.getByText(/By Anonymous/)).toBeInTheDocument();
  });

  test('shows community rating and satiety when present', async () => {
    const recipe = makeDiscoveryItem({
      communityRating: {average: 4.5, count: 2, hasStaleRatings: false},
      satietyScore: 72,
      nutritionStatus: 'ready',
    });
    await renderWithProviders(<PublicRecipeDiscoveryCard recipe={recipe} />);
    expect(screen.getByText(/4\.5 \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Satiety 72/)).toBeInTheDocument();
  });
});

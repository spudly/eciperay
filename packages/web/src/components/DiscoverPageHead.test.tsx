import type {PublicRecipeDiscoveryItem} from '@eciperay/types';
import {waitFor} from '@testing-library/react';

import {renderWithProviders} from '../test/testUtils.js';

import {DiscoverPageHead} from './DiscoverPageHead.js';

const makeDiscoveryItem = (
  overrides: Partial<PublicRecipeDiscoveryItem> = {},
): PublicRecipeDiscoveryItem => ({
  id: 'public-recipe-1',
  slug: 'shared-pasta',
  title: 'Shared Pasta',
  description: 'A public recipe',
  servings: 4,
  prepTimeMin: 10,
  cookTimeMin: 25,
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
  carbsG: null,
  fatG: null,
  ...overrides,
});

describe('DiscoverPageHead', () => {
  test('injects an ItemList JSON-LD for the listed public recipes', async () => {
    await renderWithProviders(
      <DiscoverPageHead
        recipes={[
          makeDiscoveryItem(),
          makeDiscoveryItem({
            id: 'public-recipe-2',
            slug: 'garden-salad',
            title: 'Garden Salad',
          }),
        ]}
      />,
      {withAuth: false},
    );

    await waitFor(() => {
      expect(
        document.head.querySelector('script[type="application/ld+json"]'),
      ).not.toBeNull();
    });
    const jsonLd = document.head.querySelector(
      'script[type="application/ld+json"]',
    );
    const parsed = JSON.parse(jsonLd?.textContent ?? '{}') as {
      itemListElement?: {position: number; url: string; name: string}[];
    };
    expect(parsed.itemListElement).toEqual([
      {
        '@type': 'ListItem',
        'position': 1,
        'url': `${window.location.origin}/recipe/public-recipe-1/shared-pasta`,
        'name': 'Shared Pasta',
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'url': `${window.location.origin}/recipe/public-recipe-2/garden-salad`,
        'name': 'Garden Salad',
      },
    ]);
  });

  test('injects nothing when only one recipe is listed', async () => {
    await renderWithProviders(
      <DiscoverPageHead recipes={[makeDiscoveryItem()]} />,
      {withAuth: false},
    );

    expect(
      document.head.querySelector('script[type="application/ld+json"]'),
    ).toBeNull();
  });

  test('injects nothing when no recipes are listed', async () => {
    await renderWithProviders(<DiscoverPageHead recipes={[]} />, {
      withAuth: false,
    });

    expect(
      document.head.querySelector('script[type="application/ld+json"]'),
    ).toBeNull();
  });
});

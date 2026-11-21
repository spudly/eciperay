import type {PublicRecipeDiscoveryItem} from '@eciperay/types';

import {renderStreamToHtml} from '../test/renderStreamToHtml.js';

import {renderDiscoverStream} from './renderDiscover.js';

const makeDiscoveryItem = (
  overrides: Partial<PublicRecipeDiscoveryItem> = {},
): PublicRecipeDiscoveryItem => ({
  id: 'recipe-uuid-1',
  slug: 'pasta',
  title: 'Test Recipe',
  description: 'A test recipe',
  servings: 4,
  prepTimeMin: 15,
  cookTimeMin: 30,
  imageUrl: null,
  visibility: 'public',
  authorDisplayName: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
  tags: [],
  communityRating: null,
  calories: null,
  proteinG: null,
  carbsG: null,
  fatG: null,
  fiberG: null,
  satietyScore: null,
  nutritionStatus: null,
  ...overrides,
});

describe('renderDiscoverStream', () => {
  test('renders the public browse page to HTML in-process', async () => {
    const html = await renderStreamToHtml(options =>
      renderDiscoverStream([makeDiscoveryItem()], options),
    );

    expect(html).toContain('Test Recipe');
    expect(html).toContain('Discover recipes');
  });

  test('renders a canonical link tag for /discover', async () => {
    const html = await renderStreamToHtml(options =>
      renderDiscoverStream([makeDiscoveryItem()], options),
    );

    expect(html).toContain('rel="canonical"');
    expect(html).toContain('href="https://www.eciperay.com/discover"');
  });
});

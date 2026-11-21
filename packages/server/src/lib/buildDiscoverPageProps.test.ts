import type {PublicRecipeDiscoveryItem} from '@eciperay/types';

import {buildDiscoverPageProps} from './buildDiscoverPageProps.js';

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

describe('buildDiscoverPageProps', () => {
  test('maps the public first paint: title, defaults, and permalink hrefs', () => {
    const props = buildDiscoverPageProps([makeDiscoveryItem()]);

    expect(props.title).toBe('Discover recipes');
    expect(props.loading).toBe(false);
    expect(props.errorMessage).toBeNull();
    expect(props.search).toBe('');
    expect(props.sort).toBe('newest');
    expect(props.sortDir).toBe('desc');
    expect(props.recipes).toHaveLength(1);
    expect(props.recipes[0]?.id).toBe('recipe-uuid-1');
    expect(props.recipes[0]?.title).toBe('Test Recipe');
    expect(props.recipes[0]?.href).toBe('/recipe/recipe-uuid-1/pasta');
    expect(props.footer?.brand).toEqual({label: 'Eciperay', href: '/'});
  });

  test('includes the author byline only when the author has a display name', () => {
    const named = buildDiscoverPageProps([
      makeDiscoveryItem({authorDisplayName: '  Ada Cook  '}),
    ]);
    expect(named.recipes[0]?.subtitle).toContain('By Ada Cook · ');

    const anonymous = buildDiscoverPageProps([makeDiscoveryItem()]);
    expect(anonymous.recipes[0]?.subtitle).not.toContain('By ');
  });

  test('an empty feed maps to no recipes (the page renders its empty state)', () => {
    const props = buildDiscoverPageProps([]);
    expect(props.recipes).toEqual([]);
    expect(props.emptyMessage).toContain('No public recipes yet');
  });
});

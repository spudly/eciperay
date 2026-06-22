import {makeRecipeDetail} from '../test/fixtures/recipe.js';
import {makeRecipeDetailRow} from '../test/fixtures/recipeRow.js';

import {
  mapRowToPublicRecipeDetail,
  mapRowToPublicRecipeDiscoveryItem,
  mapRowToRecipeDetail,
  mapRowToRecipeListItem,
} from './mapRowToRecipeDetail.js';

describe('mapRowToRecipeDetail', () => {
  test('maps snake_case recipe row to camelCase RecipeDetail', () => {
    expect(mapRowToRecipeDetail(makeRecipeDetailRow())).toEqual(
      makeRecipeDetail(),
    );
  });
});

describe('mapRowToPublicRecipeDetail', () => {
  test('omits owner userId from mapped recipe', () => {
    const mapped = mapRowToPublicRecipeDetail(
      makeRecipeDetailRow({user_id: 'owner-uuid'}),
    );
    expect(mapped).toEqual({
      ...makeRecipeDetail({userId: 'owner-uuid'}),
      userId: undefined,
    });
    expect('userId' in mapped).toBe(false);
  });
});

describe('mapRowToRecipeListItem', () => {
  test('maps list row fields including imageUrl', () => {
    const mapped = mapRowToRecipeListItem({
      id: 'recipe-uuid-1',
      status: 'idea',
      visibility: 'private',
      slug: 'pasta',
      content_revision: 1,
      development_status: 'idea',
      cloned_from_recipe_id: null,
      star_rating: null,
      active_version_id: 'version-uuid-1',
      version_id: 'version-uuid-1',
      version_number: 1,
      title: 'Pasta',
      description: 'Tasty',
      servings: 4,
      prep_time_min: 10,
      cook_time_min: 20,
      image_url: 'https://cdn.example/pasta.jpg',
      source_url: null,
      created_via: 'manual',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      tags: [],
    });
    expect(mapped.imageUrl).toBe('https://cdn.example/pasta.jpg');
    expect(mapped.ingredients).toEqual([]);
    expect(mapped.instructions).toEqual([]);
  });
});

describe('mapRowToPublicRecipeDiscoveryItem', () => {
  test('maps discovery row fields including author display name', () => {
    const mapped = mapRowToPublicRecipeDiscoveryItem({
      id: 'recipe-public-1',
      slug: 'public-pasta',
      visibility: 'public',
      title: 'Public Pasta',
      description: 'Shared',
      servings: 2,
      prep_time_min: null,
      cook_time_min: 15,
      image_url: null,
      updated_at: '2024-01-01T00:00:00.000Z',
      author_display_name: 'Alex',
      tags: [],
    });
    expect(mapped).toEqual({
      id: 'recipe-public-1',
      slug: 'public-pasta',
      title: 'Public Pasta',
      description: 'Shared',
      servings: 2,
      prepTimeMin: null,
      cookTimeMin: 15,
      imageUrl: null,
      visibility: 'public',
      authorDisplayName: 'Alex',
      updatedAt: '2024-01-01T00:00:00.000Z',
      tags: [],
    });
  });
});

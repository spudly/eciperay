import {makeRecipeDetail} from '../test/fixtures/recipe.js';
import {makeRecipeDetailRow} from '../test/fixtures/recipeRow.js';

import {
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

describe('mapRowToRecipeListItem', () => {
  test('maps list row fields including imageUrl', () => {
    const mapped = mapRowToRecipeListItem({
      id: 'recipe-uuid-1',
      title: 'Pasta',
      description: 'Tasty',
      servings: 4,
      prep_time_min: 10,
      cook_time_min: 20,
      image_url: 'https://cdn.example/pasta.jpg',
      star_rating: null,
      source_url: null,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      tags: [],
    });
    expect(mapped.imageUrl).toBe('https://cdn.example/pasta.jpg');
    expect(mapped.ingredients).toEqual([]);
    expect(mapped.instructions).toEqual([]);
  });
});

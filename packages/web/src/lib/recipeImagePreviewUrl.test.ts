import {
  stripImageCacheKey,
  withImageCacheKey,
} from './recipeImagePreviewUrl.js';

describe('recipeImagePreviewUrl', () => {
  test('appends a cache-busting query parameter', () => {
    expect(withImageCacheKey('https://cdn.example/recipe.png', 1234)).toBe(
      'https://cdn.example/recipe.png?v=1234',
    );
  });

  test('replaces an existing cache-busting query parameter', () => {
    expect(withImageCacheKey('https://cdn.example/recipe.png?v=1', 2)).toBe(
      'https://cdn.example/recipe.png?v=2',
    );
  });

  test('strips the cache-busting query parameter', () => {
    expect(stripImageCacheKey('https://cdn.example/recipe.png?v=1234')).toBe(
      'https://cdn.example/recipe.png',
    );
  });

  test('returns invalid URLs unchanged', () => {
    expect(stripImageCacheKey('not-a-url')).toBe('not-a-url');
  });
});

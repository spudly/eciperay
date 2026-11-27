import {
  makeRecipeDetail,
  makeRecipeVersionDetail,
} from './test/fixtures/recipe.js';

import {mergeVersionIntoRecipe} from './mergeVersionIntoRecipe.js';

describe('mergeVersionIntoRecipe', () => {
  test('overlays version fields onto recipe detail', () => {
    const recipe = makeRecipeDetail({title: 'Original'});
    const version = makeRecipeVersionDetail({title: 'Updated'});
    const merged = mergeVersionIntoRecipe(recipe, version);
    expect(merged.title).toBe('Updated');
    expect(merged.id).toBe(recipe.id);
    expect(merged.versionId).toBe(version.id);
  });

  test('overlays the version tips onto the recipe detail (#635)', () => {
    const recipe = makeRecipeDetail({tips: ['Recipe tip']});
    const version = makeRecipeVersionDetail({
      tips: ['Version tip A', 'Version tip B'],
    });
    const merged = mergeVersionIntoRecipe(recipe, version);
    expect(merged.tips).toEqual(['Version tip A', 'Version tip B']);
  });
});

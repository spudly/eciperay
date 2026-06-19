import {
  makeRecipeDetail,
  makeRecipeVersionDetail,
} from '../__tests__/fixtures/recipe';

import {mergeVersionIntoRecipe} from './mergeVersionIntoRecipe';

describe('mergeVersionIntoRecipe', () => {
  test('overlays version fields onto recipe detail', () => {
    const recipe = makeRecipeDetail({title: 'Original'});
    const version = makeRecipeVersionDetail({title: 'Updated'});
    const merged = mergeVersionIntoRecipe(recipe, version);
    expect(merged.title).toBe('Updated');
    expect(merged.versionId).toBe(version.id);
  });
});

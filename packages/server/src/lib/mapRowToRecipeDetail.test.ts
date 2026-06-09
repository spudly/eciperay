import {makeRecipeDetail} from '../test/fixtures/recipe.js';
import {makeRecipeDetailRow} from '../test/fixtures/recipeRow.js';

import {mapRowToRecipeDetail} from './mapRowToRecipeDetail.js';

describe('mapRowToRecipeDetail', () => {
  test('maps snake_case recipe row to camelCase RecipeDetail', () => {
    expect(mapRowToRecipeDetail(makeRecipeDetailRow())).toEqual(
      makeRecipeDetail(),
    );
  });
});

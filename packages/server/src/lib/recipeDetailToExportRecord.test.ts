import {makeIngredient} from '../test/fixtures/ingredient.js';
import {makeInstruction} from '../test/fixtures/instruction.js';
import {makeRecipeDetail} from '../test/fixtures/recipe.js';
import {makeTag} from '../test/fixtures/tag.js';

import {recipeDetailToExportRecord} from './recipeDetailToExportRecord.js';

describe('recipeDetailToExportRecord', () => {
  test('maps recipe detail to portable export record', () => {
    const detail = makeRecipeDetail({
      tags: [makeTag({name: 'Dinner', color: '#6366f1'})],
      ingredients: [
        makeIngredient({sortOrder: 1, name: 'Salt'}),
        makeIngredient({sortOrder: 0, name: 'Flour'}),
      ],
      instructions: [
        makeInstruction({stepNumber: 2, body: 'Bake'}),
        makeInstruction({stepNumber: 1, body: 'Mix'}),
      ],
    });

    expect(recipeDetailToExportRecord(detail)).toEqual({
      title: detail.title,
      description: detail.description,
      servings: detail.servings,
      prepTimeMin: detail.prepTimeMin,
      cookTimeMin: detail.cookTimeMin,
      starRating: detail.starRating,
      sourceUrl: detail.sourceUrl,
      tags: [{name: 'Dinner', color: '#6366f1'}],
      ingredients: [
        expect.objectContaining({sortOrder: 0, name: 'Flour'}),
        expect.objectContaining({sortOrder: 1, name: 'Salt'}),
      ],
      instructions: [
        expect.objectContaining({stepNumber: 1, body: 'Mix'}),
        expect.objectContaining({stepNumber: 2, body: 'Bake'}),
      ],
    });
  });

  test('includes image when provided', () => {
    const image = {base64: 'abc', contentType: 'image/jpeg'};
    expect(recipeDetailToExportRecord(makeRecipeDetail(), image)).toEqual(
      expect.objectContaining({image}),
    );
  });
});

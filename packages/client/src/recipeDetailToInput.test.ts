import {makeRecipeDetail} from './test/fixtures/recipe.js';
import {recipeDetailToInput} from './recipeDetailToInput.js';

describe('recipeDetailToInput', () => {
  test('maps detail to input without nested ids', () => {
    const input = recipeDetailToInput(makeRecipeDetail());
    expect(input.title).toBe('Test Recipe');
    expect(input.ingredients[0]).toEqual({
      sortOrder: 0,
      name: 'Flour',
      quantity: 2,
      unit: 'cups',
      notes: null,
      isOptional: false,
    });
    expect(input.instructions[0]).toEqual({
      stepNumber: 1,
      body: 'Mix dry ingredients',
    });
    expect(input.tagIds).toEqual(['tag-1']);
  });
});

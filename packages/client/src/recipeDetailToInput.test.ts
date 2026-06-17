import {makeRecipeDetail} from './test/fixtures/recipe.js';
import {recipeDetailToInput} from './recipeDetailToInput.js';

describe('recipeDetailToInput', () => {
  test('maps detail to input without nested ids', () => {
    const input = recipeDetailToInput(makeRecipeDetail());
    expect(input.title).toBe('Test Recipe');
    expect(input.ingredients[0]).toEqual({
      key: 'i-1',
      sortOrder: 0,
      name: 'Flour',
      quantity: 2,
      unit: 'cups',
      notes: null,
      isOptional: false,
    });
    expect(input.instructions[0]).toEqual({
      key: 'ins-1',
      stepNumber: 1,
      body: 'Mix dry ingredients',
    });
    expect(input.tagIds).toEqual(['tag-1']);
  });

  test('sorts ingredients by sortOrder', () => {
    const input = recipeDetailToInput(
      makeRecipeDetail({
        ingredients: [
          {
            id: 'i-3',
            recipeId: 'recipe-uuid-1',
            sortOrder: 2,
            name: 'Salt',
            quantity: 1,
            unit: 'tsp',
            notes: null,
            isOptional: false,
          },
          {
            id: 'i-1',
            recipeId: 'recipe-uuid-1',
            sortOrder: 0,
            name: 'Flour',
            quantity: 2,
            unit: 'cups',
            notes: null,
            isOptional: false,
          },
          {
            id: 'i-2',
            recipeId: 'recipe-uuid-1',
            sortOrder: 1,
            name: 'Sugar',
            quantity: 1,
            unit: 'cup',
            notes: null,
            isOptional: false,
          },
        ],
      }),
    );
    expect(input.ingredients.map(ing => ing.name)).toEqual([
      'Flour',
      'Sugar',
      'Salt',
    ]);
  });

  test('sorts instructions by stepNumber', () => {
    const input = recipeDetailToInput(
      makeRecipeDetail({
        instructions: [
          {
            id: 'ins-3',
            recipeId: 'recipe-uuid-1',
            stepNumber: 3,
            body: 'Serve',
          },
          {id: 'ins-1', recipeId: 'recipe-uuid-1', stepNumber: 1, body: 'Prep'},
          {id: 'ins-2', recipeId: 'recipe-uuid-1', stepNumber: 2, body: 'Cook'},
        ],
      }),
    );
    expect(input.instructions.map(ins => ins.body)).toEqual([
      'Prep',
      'Cook',
      'Serve',
    ]);
  });
});

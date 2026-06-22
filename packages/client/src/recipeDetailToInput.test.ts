import {
  makeRecipeDetail,
  makeRecipeVersionDetail,
  VERSION_ID,
} from './test/fixtures/recipe.js';
import {
  recipeDetailToInput,
  recipeVersionDetailToInput,
} from './recipeDetailToInput.js';

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
    expect(input.developmentStatus).toBe('idea');
  });

  test('sorts ingredients by sortOrder', () => {
    const input = recipeDetailToInput(
      makeRecipeDetail({
        ingredients: [
          {
            id: 'i-3',
            recipeVersionId: VERSION_ID,
            sortOrder: 2,
            name: 'Salt',
            quantity: 1,
            unit: 'tsp',
            notes: null,
            isOptional: false,
          },
          {
            id: 'i-1',
            recipeVersionId: VERSION_ID,
            sortOrder: 0,
            name: 'Flour',
            quantity: 2,
            unit: 'cups',
            notes: null,
            isOptional: false,
          },
          {
            id: 'i-2',
            recipeVersionId: VERSION_ID,
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
            recipeVersionId: VERSION_ID,
            stepNumber: 3,
            body: 'Serve',
          },
          {
            id: 'ins-1',
            recipeVersionId: VERSION_ID,
            stepNumber: 1,
            body: 'Prep',
          },
          {
            id: 'ins-2',
            recipeVersionId: VERSION_ID,
            stepNumber: 2,
            body: 'Cook',
          },
        ],
      }),
    );
    expect(input.instructions.map(ins => ins.body)).toEqual([
      'Prep',
      'Cook',
      'Serve',
    ]);
  });

  test('maps version detail to input', () => {
    const input = recipeVersionDetailToInput(makeRecipeVersionDetail());
    expect(input.title).toBe('Test Recipe');
    expect(input.tagIds).toEqual(['tag-1']);
    expect(input.developmentStatus).toBe('idea');
  });
});

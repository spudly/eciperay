import {
  ensureIngredientRowKeys,
  ensureInstructionRowKeys,
  toRecipeInputIngredients,
  toRecipeInputInstructions,
} from './recipeFormRows.js';

describe('recipeFormRows', () => {
  test('ensures stable keys for form rows', () => {
    expect(
      ensureIngredientRowKeys([
        {
          sortOrder: 0,
          name: 'Flour',
          quantity: 1,
          unit: 'cup',
          notes: null,
          isOptional: false,
          key: 'ing-1',
        },
      ]),
    ).toEqual([expect.objectContaining({key: 'ing-1', name: 'Flour'})]);
    expect(
      ensureInstructionRowKeys([{stepNumber: 1, body: 'Mix', key: 'step-1'}]),
    ).toEqual([expect.objectContaining({key: 'step-1', body: 'Mix'})]);
  });

  test('generates keys when missing', () => {
    const ingredients = ensureIngredientRowKeys([
      {
        sortOrder: 0,
        name: 'Flour',
        quantity: 1,
        unit: 'cup',
        notes: null,
        isOptional: false,
      },
    ]);
    expect(ingredients[0]?.key).toEqual(expect.any(String));
  });

  test('strips keys when converting back to recipe input rows', () => {
    const ingredients = ensureIngredientRowKeys([
      {
        sortOrder: 5,
        name: 'Salt',
        quantity: 1,
        unit: 'tsp',
        notes: null,
        isOptional: false,
      },
    ]);
    expect(toRecipeInputIngredients(ingredients)).toEqual([
      {
        sortOrder: 0,
        name: 'Salt',
        quantity: 1,
        unit: 'tsp',
        notes: null,
        isOptional: false,
      },
    ]);

    const instructions = ensureInstructionRowKeys([
      {stepNumber: 9, body: 'Serve'},
    ]);
    expect(toRecipeInputInstructions(instructions)).toEqual([
      {stepNumber: 1, body: 'Serve'},
    ]);
  });
});

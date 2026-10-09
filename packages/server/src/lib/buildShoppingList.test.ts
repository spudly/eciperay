import {buildShoppingList} from './buildShoppingList.js';

describe('buildShoppingList', () => {
  test('merges same name and unit', () => {
    const lines = buildShoppingList([
      {
        name: 'Flour',
        quantity: 1,
        unit: 'cup',
        isOptional: false,
        servings: 2,
        recipeServings: 2,
        quantityMultiplier: 1,
        source: {
          mealId: null,
          mealTitle: null,
          recipeId: 'r1',
          recipeTitle: 'Bread',
        },
      },
      {
        name: 'flour',
        quantity: 2,
        unit: 'cup',
        isOptional: true,
        servings: 2,
        recipeServings: 2,
        quantityMultiplier: 1,
        source: {
          mealId: 'm1',
          mealTitle: 'Dinner',
          recipeId: 'r2',
          recipeTitle: 'Cake',
        },
      },
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.quantity).toBe(3);
    expect(lines[0]?.isOptional).toBe(false);
  });

  test('null quantity when units conflict within merge key is impossible; different units stay separate', () => {
    const lines = buildShoppingList([
      {
        name: 'Milk',
        quantity: 1,
        unit: 'cup',
        isOptional: false,
        servings: 1,
        recipeServings: 1,
        quantityMultiplier: 1,
        source: {
          mealId: null,
          mealTitle: null,
          recipeId: 'r1',
          recipeTitle: 'A',
        },
      },
      {
        name: 'Milk',
        quantity: 1,
        unit: 'ml',
        isOptional: false,
        servings: 1,
        recipeServings: 1,
        quantityMultiplier: 1,
        source: {
          mealId: null,
          mealTitle: null,
          recipeId: 'r2',
          recipeTitle: 'B',
        },
      },
    ]);
    expect(lines).toHaveLength(2);
  });

  test('keeps optional false when any merged line is required', () => {
    const lines = buildShoppingList([
      {
        name: 'Butter',
        quantity: 1,
        unit: 'tbsp',
        isOptional: true,
        servings: 1,
        recipeServings: 1,
        quantityMultiplier: 1,
        source: {
          mealId: null,
          mealTitle: null,
          recipeId: 'r1',
          recipeTitle: 'A',
        },
      },
      {
        name: 'Butter',
        quantity: 1,
        unit: 'tbsp',
        isOptional: false,
        servings: 1,
        recipeServings: 1,
        quantityMultiplier: 1,
        source: {
          mealId: null,
          mealTitle: null,
          recipeId: 'r2',
          recipeTitle: 'B',
        },
      },
    ]);
    expect(lines[0]?.isOptional).toBe(false);
  });

  test('skips invalid servings and merges null quantities', () => {
    const lines = buildShoppingList([
      {
        name: 'Eggs',
        quantity: null,
        unit: null,
        isOptional: false,
        servings: 2,
        recipeServings: 0,
        quantityMultiplier: 1,
        source: {
          mealId: null,
          mealTitle: null,
          recipeId: 'r0',
          recipeTitle: 'Skip',
        },
      },
      {
        name: 'Eggs',
        quantity: null,
        unit: null,
        isOptional: false,
        servings: 2,
        recipeServings: 2,
        quantityMultiplier: 1,
        source: {
          mealId: null,
          mealTitle: null,
          recipeId: 'r1',
          recipeTitle: 'A',
        },
      },
      {
        name: 'Eggs',
        quantity: 2,
        unit: null,
        isOptional: false,
        servings: 2,
        recipeServings: 2,
        quantityMultiplier: 1,
        source: {
          mealId: null,
          mealTitle: null,
          recipeId: 'r2',
          recipeTitle: 'B',
        },
      },
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.quantity).toBeNull();
  });
});

import {
  formatScaleMultiplierLabel,
  formatScaledIngredientLine,
  isActiveScaleMultiplier,
  resolveRecipeServings,
  scaleFactorFromServings,
  servingsForMultiplier,
  sortIngredientsByOrder,
} from './recipeScaling.js';

describe('servingsForMultiplier', () => {
  test('scales servings and enforces a minimum of one', () => {
    expect(servingsForMultiplier(4, 2)).toBe(8);
    expect(servingsForMultiplier(4, 0.5)).toBe(2);
    expect(servingsForMultiplier(1, 0.5)).toBe(1);
  });
});

describe('scale multiplier labels', () => {
  test('formats multiplier buttons', () => {
    expect(formatScaleMultiplierLabel(0.5)).toBe('½×');
    expect(formatScaleMultiplierLabel(2)).toBe('2×');
  });

  test('detects the active multiplier', () => {
    expect(isActiveScaleMultiplier(4, 8, 2)).toBe(true);
    expect(isActiveScaleMultiplier(4, 5, 2)).toBe(false);
  });
});

describe('scaleFactorFromServings', () => {
  test('returns the ratio of servings to base servings', () => {
    expect(scaleFactorFromServings(4, 8)).toBe(2);
    expect(scaleFactorFromServings(4, 2)).toBe(0.5);
  });
});

describe('resolveRecipeServings', () => {
  test('uses the override when valid and falls back otherwise', () => {
    expect(resolveRecipeServings('8', 4)).toBe(8);
    expect(resolveRecipeServings(6, 4)).toBe(6);
    expect(resolveRecipeServings('bad', 4)).toBe(4);
    expect(resolveRecipeServings(undefined, 4)).toBe(4);
    expect(resolveRecipeServings(null, 4)).toBe(4);
    expect(resolveRecipeServings('0', 4)).toBe(4);
    expect(resolveRecipeServings(0.5, 4)).toBe(4);
  });
});

describe('formatScaledIngredientLine', () => {
  test('formats scaled ingredient quantities', () => {
    expect(
      formatScaledIngredientLine({name: 'Flour', quantity: 2, unit: 'cups'}, 2),
    ).toBe('4 cups Flour');
  });

  test('returns the ingredient name when quantity cannot be scaled', () => {
    expect(
      formatScaledIngredientLine({name: 'Salt', quantity: null, unit: null}, 2),
    ).toBe('Salt');
  });
});

describe('sortIngredientsByOrder', () => {
  test('sorts ingredients by sort order', () => {
    expect(
      sortIngredientsByOrder([
        {sortOrder: 2, name: 'Salt'},
        {sortOrder: 0, name: 'Flour'},
      ]).map(ingredient => ingredient.name),
    ).toEqual(['Flour', 'Salt']);
  });
});

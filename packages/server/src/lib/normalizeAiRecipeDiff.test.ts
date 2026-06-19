import {
  normalizeAiIngredient,
  normalizeAiInstruction,
} from './normalizeAiRecipeDiff.js';

describe('normalizeAiIngredient', () => {
  test('fills sortOrder from array index when missing', () => {
    expect(
      normalizeAiIngredient(
        {name: 'flour', quantity: 2, unit: 'cups', notes: null},
        2,
      ),
    ).toEqual({
      sortOrder: 2,
      name: 'flour',
      quantity: 2,
      unit: 'cups',
      notes: null,
      isOptional: false,
    });
  });

  test('accepts snake_case fields', () => {
    expect(
      normalizeAiIngredient(
        {
          sort_order: 1,
          name: 'sugar',
          quantity: 1,
          unit: 'cup',
          notes: null,
          is_optional: true,
        },
        0,
      ),
    ).toEqual({
      sortOrder: 1,
      name: 'sugar',
      quantity: 1,
      unit: 'cup',
      notes: null,
      isOptional: true,
    });
  });

  test('returns non-object values unchanged', () => {
    expect(normalizeAiIngredient('invalid', 0)).toBe('invalid');
  });
});

describe('normalizeAiInstruction', () => {
  test('fills stepNumber from array index when missing', () => {
    expect(normalizeAiInstruction({body: 'Bake.'}, 3)).toEqual({
      stepNumber: 4,
      body: 'Bake.',
    });
  });

  test('returns non-object values unchanged', () => {
    expect(normalizeAiInstruction(null, 0)).toBeNull();
  });
});

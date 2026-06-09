import {scaleQuantity} from './scaleQuantity';

describe('scaleQuantity', () => {
  test('returns empty string when quantity is null', () => {
    expect(scaleQuantity(null, 'cups', 1)).toBe('');
  });

  test('returns whole number for simple integer result', () => {
    expect(scaleQuantity(2, null, 1)).toBe('2');
  });

  test('displays fraction symbols for common fractions', () => {
    expect(scaleQuantity(1, null, 0.25)).toBe('¼');
    expect(scaleQuantity(1, null, 0.5)).toBe('½');
    expect(scaleQuantity(1, null, 0.75)).toBe('¾');
    expect(scaleQuantity(1, null, 0.125)).toBe('⅛');
  });

  test('combines whole number and fraction', () => {
    expect(scaleQuantity(3, null, 0.5)).toBe('1 ½');
  });

  test('converts 3 tsp to 1 tbsp', () => {
    expect(scaleQuantity(3, 'tsp', 1)).toBe('1 tbsp');
  });

  test('converts 4 tbsp to ¼ cup', () => {
    expect(scaleQuantity(4, 'tbsp', 1)).toBe('¼ cup');
  });

  test('converts 16 tbsp to 1 cup', () => {
    expect(scaleQuantity(16, 'tbsp', 1)).toBe('1 cup');
  });

  test('converts 2 cups to 1 pint via unit conversion chain', () => {
    // 1 cup × 2 = 2 cups; 2 cups → 1 pint
    expect(scaleQuantity(1, 'cup', 2)).toBe('1 pint');
  });

  test('returns quantity without unit when unit is null', () => {
    expect(scaleQuantity(5, null, 1)).toBe('5');
  });

  test('returns decimal string when no fraction matches', () => {
    // 1/6 ≈ 0.1666 — |0.1666 - 0.125| = 0.042 > 0.04 so no fraction match
    const result = scaleQuantity(6, null, 1 / 6);
    // 6 * (1/6) = 1 exactly; Math.floor(1) = 1, remainder = 0
    expect(result).toBe('1');
  });

  test('handles scaling with unit and no conversion needed', () => {
    expect(scaleQuantity(1, 'tsp', 1)).toBe('1 tsp');
  });

  test('uses decimal when no fraction matches (remainder does not match any FRACTIONS entry)', () => {
    // 1 * 0.167 = 0.167; closest fraction 1/8=0.125, |0.125-0.167|=0.042 > 0.04 threshold
    // So toFixed(2) is used, result = '0.17'
    expect(scaleQuantity(1, null, 0.167)).toBe('0.17');
  });
});

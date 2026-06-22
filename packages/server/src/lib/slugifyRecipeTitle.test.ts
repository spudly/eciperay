import {slugifyRecipeTitle} from './slugifyRecipeTitle.js';

describe('slugifyRecipeTitle', () => {
  test('lowercases and hyphenates words', () => {
    expect(slugifyRecipeTitle('Chicken Tikka Masala')).toBe(
      'chicken-tikka-masala',
    );
  });

  test('strips special characters', () => {
    expect(slugifyRecipeTitle('Mom\'s "Best" Pie!')).toBe('moms-best-pie');
  });

  test('normalizes accented characters', () => {
    expect(slugifyRecipeTitle('Crème Brûlée')).toBe('creme-brulee');
  });

  test('returns recipe for empty titles', () => {
    expect(slugifyRecipeTitle('   ')).toBe('recipe');
    expect(slugifyRecipeTitle('!!!')).toBe('recipe');
  });

  test('collapses repeated hyphens', () => {
    expect(slugifyRecipeTitle('a   b---c')).toBe('a-b-c');
  });
});

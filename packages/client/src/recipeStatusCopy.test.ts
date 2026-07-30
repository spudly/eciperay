import {
  RECIPE_STATUS_LABELS,
  RECIPE_STATUS_OPTIONS,
  normalizeRecipeStatus,
} from './recipeStatusCopy.js';

describe('recipeStatusCopy', () => {
  test('exports status labels and options', () => {
    expect(RECIPE_STATUS_OPTIONS).toEqual([
      'idea',
      'evolving',
      'perfected',
      'abandoned',
    ]);
    expect(RECIPE_STATUS_LABELS.idea).toBe('Idea');
    expect(RECIPE_STATUS_LABELS.perfected).toBe('Perfected');
  });

  test('normalizeRecipeStatus falls back to idea for unknown values', () => {
    expect(normalizeRecipeStatus()).toBe('idea');
    expect(normalizeRecipeStatus(null)).toBe('idea');
    expect(normalizeRecipeStatus('archived' as 'idea')).toBe('idea');
    expect(normalizeRecipeStatus('evolving')).toBe('evolving');
  });
});

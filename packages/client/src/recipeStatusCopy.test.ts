import {
  RECIPE_STATUS_LABELS,
  RECIPE_STATUS_OPTIONS,
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
});

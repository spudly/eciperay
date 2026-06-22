import {
  RECIPE_DEVELOPMENT_STATUS_LABELS,
  RECIPE_DEVELOPMENT_STATUS_OPTIONS,
} from './developmentStatusCopy.js';

describe('developmentStatusCopy', () => {
  test('exports development status labels and options', () => {
    expect(RECIPE_DEVELOPMENT_STATUS_OPTIONS).toEqual([
      'idea',
      'in_development',
      'perfected',
    ]);
    expect(RECIPE_DEVELOPMENT_STATUS_LABELS.idea).toBe('Idea');
    expect(RECIPE_DEVELOPMENT_STATUS_LABELS.perfected).toBe('Perfected');
  });
});

import {
  isRecipeEditable,
  recipeEditBlockedError,
} from './assertRecipeEditable.js';

describe('assertRecipeEditable', () => {
  test('allows idea and evolving statuses', () => {
    expect(isRecipeEditable('idea')).toBe(true);
    expect(isRecipeEditable('evolving')).toBe(true);
  });

  test('blocks perfected and abandoned statuses', () => {
    expect(isRecipeEditable('perfected')).toBe(false);
    expect(isRecipeEditable('abandoned')).toBe(false);
  });

  test('returns user-facing blocked message', () => {
    expect(recipeEditBlockedError()).toBe(
      'Recipe cannot be modified in its current status',
    );
  });
});

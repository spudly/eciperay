import {recipeViewHistoryStorage} from './recipeViewHistoryStorage.js';

describe('recipeViewHistoryStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('reads, writes, and removes via localStorage', () => {
    void recipeViewHistoryStorage.setItem('test-key', 'value');
    expect(recipeViewHistoryStorage.getItem('test-key')).toBe('value');
    void recipeViewHistoryStorage.removeItem('test-key');
    expect(recipeViewHistoryStorage.getItem('test-key')).toBeNull();
  });
});

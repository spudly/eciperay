import {demoRecipeListFilters} from './demoRecipeListFilters.js';

describe('demoRecipeListFilters', () => {
  test('returns empty no-op filter controls', () => {
    const controls = demoRecipeListFilters();
    expect(controls.search).toBe('');
    expect(controls.sort).toBe('newest');
    expect(controls.sortDir).toBe('desc');
    expect(() => {
      controls.onSearchChange('x');
      controls.onSortChange('rating');
      controls.onSortDirChange('asc');
    }).not.toThrow();
  });
});

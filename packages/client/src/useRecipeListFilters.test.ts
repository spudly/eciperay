import {act, renderHook} from '@testing-library/react';

import {useRecipeListFilters} from './useRecipeListFilters.js';

describe('useRecipeListFilters', () => {
  test('exposes controls and built filters with defaults', () => {
    const {result} = renderHook(() => useRecipeListFilters());

    expect(result.current.controls.showStatusFilter).toBe(true);
    expect(result.current.controls.sort).toBe('newest');
    expect(result.current.filters.sort).toBe('newest');

    const {onStatusFilterChange} = result.current.controls;
    expect(onStatusFilterChange).toBeDefined();

    act(() => {
      result.current.controls.onSearchChange(' chili ');
      result.current.controls.onIngredientChange(' bean ');
      onStatusFilterChange?.('evolving');
      result.current.controls.onMinCaloriesChange('200');
      result.current.controls.onSortChange('satiety');
      result.current.controls.onSortDirChange('asc');
    });

    expect(result.current.filters).toMatchObject({
      search: 'chili',
      ingredient: 'bean',
      status: 'evolving',
      minCalories: 200,
      sort: 'satiety',
      sortDir: 'asc',
    });
  });

  test('honors includeStatus false and custom defaultSort', () => {
    const {result} = renderHook(() =>
      useRecipeListFilters({includeStatus: false, defaultSort: 'calories'}),
    );

    expect(result.current.controls.showStatusFilter).toBe(false);
    expect(result.current.filters.sort).toBe('calories');

    act(() => {
      result.current.controls.onStatusFilterChange?.('perfected');
    });
    expect(result.current.filters.status).toBeUndefined();
  });
});

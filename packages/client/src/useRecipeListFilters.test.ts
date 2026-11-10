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

  test('seeds from initialValues and round-trips through values', () => {
    const {result} = renderHook(() =>
      useRecipeListFilters({initialValues: {search: 'soup', sortDir: 'asc'}}),
    );

    expect(result.current.controls.search).toBe('soup');
    expect(result.current.values).toMatchObject({
      search: 'soup',
      sortDir: 'asc',
      sort: 'newest',
    });

    act(() => {
      result.current.controls.onIngredientChange('bean');
    });
    expect(result.current.values.ingredient).toBe('bean');

    // A remount seeded from the carried values restores them (#468).
    const {result: restored} = renderHook(() =>
      useRecipeListFilters({initialValues: result.current.values}),
    );
    expect(restored.current.values).toEqual(result.current.values);
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

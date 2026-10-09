import {act, renderHook} from '@testing-library/react';

import {RECIPE_STATUS_FILTER_ALL} from './recipeStatusCopy.js';
import {useFilterFieldState} from './useFilterFieldState.js';

describe('useFilterFieldState', () => {
  test('initializes defaults and updates fields', () => {
    const {result} = renderHook(() => useFilterFieldState('rating'));

    expect(result.current.search).toBe('');
    expect(result.current.statusFilter).toBe(RECIPE_STATUS_FILTER_ALL);
    expect(result.current.sort).toBe('rating');
    expect(result.current.sortDir).toBe('desc');

    act(() => {
      result.current.setSearch('soup');
      result.current.setStatusFilter('idea');
      result.current.setIngredient('egg');
      result.current.setMinCalories('100');
      result.current.setMaxCalories('400');
      result.current.setMinSatiety('20');
      result.current.setMaxSatiety('80');
      result.current.setSort('calories');
      result.current.setSortDir('asc');
    });

    expect(result.current.search).toBe('soup');
    expect(result.current.statusFilter).toBe('idea');
    expect(result.current.ingredient).toBe('egg');
    expect(result.current.minCalories).toBe('100');
    expect(result.current.maxCalories).toBe('400');
    expect(result.current.minSatiety).toBe('20');
    expect(result.current.maxSatiety).toBe('80');
    expect(result.current.sort).toBe('calories');
    expect(result.current.sortDir).toBe('asc');
  });
});

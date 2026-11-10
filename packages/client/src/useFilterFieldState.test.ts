import {act, renderHook} from '@testing-library/react';

import {RECIPE_STATUS_FILTER_ALL} from './recipeStatusCopy.js';
import {
  parseRecipeListFilterValues,
  useFilterFieldState,
} from './useFilterFieldState.js';

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

  test('seeds fields from initialValues, defaults elsewhere', () => {
    const {result} = renderHook(() =>
      useFilterFieldState('newest', {
        search: 'soup',
        statusFilter: 'perfected',
        sort: 'satiety',
        sortDir: 'asc',
      }),
    );

    expect(result.current.search).toBe('soup');
    expect(result.current.statusFilter).toBe('perfected');
    expect(result.current.ingredient).toBe('');
    expect(result.current.sort).toBe('satiety');
    expect(result.current.sortDir).toBe('asc');
  });
});

describe('parseRecipeListFilterValues', () => {
  test('returns undefined when the carrier holds no filter object', () => {
    expect(parseRecipeListFilterValues(undefined)).toBeUndefined();
    expect(parseRecipeListFilterValues(null)).toBeUndefined();
    expect(parseRecipeListFilterValues('filters')).toBeUndefined();
    expect(parseRecipeListFilterValues({})).toBeUndefined();
    expect(
      parseRecipeListFilterValues({recipeListFilters: 'nope'}),
    ).toBeUndefined();
    expect(
      parseRecipeListFilterValues({recipeListFilters: [1, 2]}),
    ).toBeUndefined();
  });

  test('keeps well-formed fields and drops malformed ones', () => {
    expect(
      parseRecipeListFilterValues({
        recipeListFilters: {
          search: 'soup',
          statusFilter: 'evolving',
          ingredient: 'bean',
          minCalories: '100',
          maxCalories: 900,
          minSatiety: '2',
          maxSatiety: '9',
          sort: 'rating',
          sortDir: 'asc',
          unrelated: 'ignored',
        },
      }),
    ).toEqual({
      search: 'soup',
      statusFilter: 'evolving',
      ingredient: 'bean',
      minCalories: '100',
      minSatiety: '2',
      maxSatiety: '9',
      sort: 'rating',
      sortDir: 'asc',
    });
  });

  test('drops out-of-enum select values instead of trusting them', () => {
    expect(
      parseRecipeListFilterValues({
        recipeListFilters: {
          statusFilter: 'bogus',
          sort: 'oldest',
          sortDir: 'sideways',
        },
      }),
    ).toEqual({});
  });
});

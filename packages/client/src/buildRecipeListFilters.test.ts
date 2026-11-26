import {buildRecipeListFilters} from './buildRecipeListFilters.js';
import type {FilterFieldState} from './useFilterFieldState.js';

const fields = (
  overrides: Partial<FilterFieldState> = {},
): FilterFieldState => ({
  search: '',
  setSearch: () => {},
  ingredient: '',
  setIngredient: () => {},
  minCalories: '',
  setMinCalories: () => {},
  maxCalories: '',
  setMaxCalories: () => {},
  minSatiety: '',
  setMinSatiety: () => {},
  maxSatiety: '',
  setMaxSatiety: () => {},
  sort: 'newest',
  setSort: () => {},
  sortDir: 'desc',
  setSortDir: () => {},
  ...overrides,
});

describe('buildRecipeListFilters', () => {
  test('builds filters from field state and deferred text', () => {
    expect(
      buildRecipeListFilters(
        fields({
          minCalories: '100',
          maxCalories: '500',
          minSatiety: '40',
          maxSatiety: '90',
          sort: 'satiety',
          sortDir: 'asc',
        }),
        'pasta',
        'chicken',
      ),
    ).toEqual({
      search: 'pasta',
      ingredient: 'chicken',
      minCalories: 100,
      maxCalories: 500,
      minSatiety: 40,
      maxSatiety: 90,
      sort: 'satiety',
      sortDir: 'asc',
    });
  });

  test('skips invalid numbers', () => {
    expect(
      buildRecipeListFilters(
        fields({minCalories: '  ', maxSatiety: 'x'}),
        '',
        '',
      ),
    ).toEqual({
      minCalories: undefined,
      maxCalories: undefined,
      minSatiety: undefined,
      maxSatiety: undefined,
      sort: 'newest',
      sortDir: 'desc',
    });
  });
});

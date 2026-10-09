import {RECIPE_STATUS_FILTER_ALL} from './recipeStatusCopy.js';
import {buildRecipeListFilters} from './buildRecipeListFilters.js';
import type {FilterFieldState} from './useFilterFieldState.js';

const fields = (
  overrides: Partial<FilterFieldState> = {},
): FilterFieldState => ({
  search: '',
  setSearch: () => {},
  statusFilter: RECIPE_STATUS_FILTER_ALL,
  setStatusFilter: () => {},
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
          statusFilter: 'evolving',
          minCalories: '100',
          maxCalories: '500',
          minSatiety: '40',
          maxSatiety: '90',
          sort: 'satiety',
          sortDir: 'asc',
        }),
        'pasta',
        'chicken',
        true,
      ),
    ).toEqual({
      search: 'pasta',
      ingredient: 'chicken',
      status: 'evolving',
      minCalories: 100,
      maxCalories: 500,
      minSatiety: 40,
      maxSatiety: 90,
      sort: 'satiety',
      sortDir: 'asc',
    });
  });

  test('omits status when disabled or all, and skips invalid numbers', () => {
    expect(
      buildRecipeListFilters(
        fields({statusFilter: 'perfected', minCalories: '  ', maxSatiety: 'x'}),
        '',
        '',
        false,
      ),
    ).toEqual({
      minCalories: undefined,
      maxCalories: undefined,
      minSatiety: undefined,
      maxSatiety: undefined,
      sort: 'newest',
      sortDir: 'desc',
    });
    expect(
      buildRecipeListFilters(fields({statusFilter: 'idea'}), '', '', true)
        .status,
    ).toBe('idea');
  });
});

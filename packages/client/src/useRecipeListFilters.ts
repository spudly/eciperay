import type {RecipeListSort} from '@eciperay/types';
import {useDeferredValue, useMemo} from 'react';

import {buildRecipeListFilters} from './buildRecipeListFilters.js';
import type {RecipeListFilterControls} from './ui/recipeListFilterControls.js';
import {
  useFilterFieldState,
  type FilterFieldState,
  type RecipeListFilterValues,
} from './useFilterFieldState.js';

const toControls = (
  fields: FilterFieldState,
  includeStatus: boolean,
): RecipeListFilterControls => ({
  search: fields.search,
  onSearchChange: fields.setSearch,
  statusFilter: fields.statusFilter,
  onStatusFilterChange: fields.setStatusFilter,
  ingredient: fields.ingredient,
  onIngredientChange: fields.setIngredient,
  minCalories: fields.minCalories,
  onMinCaloriesChange: fields.setMinCalories,
  maxCalories: fields.maxCalories,
  onMaxCaloriesChange: fields.setMaxCalories,
  minSatiety: fields.minSatiety,
  onMinSatietyChange: fields.setMinSatiety,
  maxSatiety: fields.maxSatiety,
  onMaxSatietyChange: fields.setMaxSatiety,
  sort: fields.sort,
  onSortChange: fields.setSort,
  sortDir: fields.sortDir,
  onSortDirChange: fields.setSortDir,
  showStatusFilter: includeStatus,
});

export const useRecipeListFilters = (options?: {
  includeStatus?: boolean;
  defaultSort?: RecipeListSort;
  initialValues?: Partial<RecipeListFilterValues>;
}) => {
  const includeStatus = options?.includeStatus ?? true;
  const fields = useFilterFieldState(
    options?.defaultSort ?? 'newest',
    options?.initialValues,
  );
  const deferredSearch = useDeferredValue(fields.search.trim());
  const deferredIngredient = useDeferredValue(fields.ingredient.trim());

  const filters = useMemo(
    () =>
      buildRecipeListFilters(
        fields,
        deferredSearch,
        deferredIngredient,
        includeStatus,
      ),
    [deferredIngredient, deferredSearch, fields, includeStatus],
  );

  // The current raw field values, for hosts that persist them across
  // navigation (#468): serializable as-is and accepted back through
  // the `initialValues` option.
  const values: RecipeListFilterValues = {
    search: fields.search,
    statusFilter: fields.statusFilter,
    ingredient: fields.ingredient,
    minCalories: fields.minCalories,
    maxCalories: fields.maxCalories,
    minSatiety: fields.minSatiety,
    maxSatiety: fields.maxSatiety,
    sort: fields.sort,
    sortDir: fields.sortDir,
  };

  return {filters, controls: toControls(fields, includeStatus), values};
};

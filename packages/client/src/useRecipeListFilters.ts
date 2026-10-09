import type {RecipeListSort} from '@eciperay/types';
import {useDeferredValue, useMemo} from 'react';

import {buildRecipeListFilters} from './buildRecipeListFilters.js';
import type {RecipeListFilterControls} from './ui/recipeListFilterControls.js';
import {
  useFilterFieldState,
  type FilterFieldState,
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
}) => {
  const includeStatus = options?.includeStatus ?? true;
  const fields = useFilterFieldState(options?.defaultSort ?? 'newest');
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

  return {filters, controls: toControls(fields, includeStatus)};
};

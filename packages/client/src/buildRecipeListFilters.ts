import type {RecipeStatus} from '@eciperay/types';

import {RECIPE_STATUS_FILTER_ALL} from './recipeStatusCopy.js';
import type {RecipeListFilters} from './recipesListUrl.js';
import type {RecipeStatusFilterValue} from './ui/recipeListFilterControls.js';
import type {FilterFieldState} from './useFilterFieldState.js';

const parseOptionalNumberInput = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return parsed;
};

const resolveStatusFilter = (
  includeStatus: boolean,
  statusFilter: RecipeStatusFilterValue,
): RecipeStatus | undefined => {
  if (!includeStatus || statusFilter === RECIPE_STATUS_FILTER_ALL) {
    return undefined;
  }
  return statusFilter;
};

export const buildRecipeListFilters = (
  fields: FilterFieldState,
  deferredSearch: string,
  deferredIngredient: string,
  includeStatus: boolean,
): RecipeListFilters => {
  const filters: RecipeListFilters = {
    minCalories: parseOptionalNumberInput(fields.minCalories),
    maxCalories: parseOptionalNumberInput(fields.maxCalories),
    minSatiety: parseOptionalNumberInput(fields.minSatiety),
    maxSatiety: parseOptionalNumberInput(fields.maxSatiety),
    sort: fields.sort,
    sortDir: fields.sortDir,
  };
  if (deferredSearch) {
    filters.search = deferredSearch;
  }
  if (deferredIngredient) {
    filters.ingredient = deferredIngredient;
  }
  const status = resolveStatusFilter(includeStatus, fields.statusFilter);
  if (status) {
    filters.status = status;
  }
  return filters;
};

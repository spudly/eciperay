import type {RecipeListFilters} from './recipesListUrl.js';
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

export const buildRecipeListFilters = (
  fields: FilterFieldState,
  deferredSearch: string,
  deferredIngredient: string,
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
  return filters;
};

import type {RecipeListSort, RecipeListSortDir} from '@eciperay/types';
import {useState} from 'react';

import {RECIPE_STATUS_FILTER_ALL} from './recipeStatusCopy.js';
import type {RecipeStatusFilterValue} from './ui/recipeListFilterControls.js';

/**
 * The raw, serializable values of the recipe-list filter fields — the shape
 * hosts persist across navigation (e.g. in router location state, #468) and
 * pass back as `initialValues` to restore a list's filters exactly as the user
 * left them.
 */
export type RecipeListFilterValues = {
  search: string;
  statusFilter: RecipeStatusFilterValue;
  ingredient: string;
  minCalories: string;
  maxCalories: string;
  minSatiety: string;
  maxSatiety: string;
  sort: RecipeListSort;
  sortDir: RecipeListSortDir;
};

const STATUS_FILTER_VALUES: readonly RecipeStatusFilterValue[] = [
  RECIPE_STATUS_FILTER_ALL,
  'idea',
  'evolving',
  'perfected',
  'abandoned',
];

const SORT_VALUES: readonly RecipeListSort[] = [
  'newest',
  'rating',
  'satiety',
  'calories',
];

const SORT_DIR_VALUES: readonly RecipeListSortDir[] = ['asc', 'desc'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Defensively extract filter values from an untrusted carrier (router location
 * state written by an earlier visit, a shared link, or another page): only
 * fields with the right shape survive — strings for the text fields, members of
 * the known enums for the selects — and anything else falls back to the field's
 * default by omission. Returns undefined when the carrier holds no usable
 * filter object at all, so callers can tell "no saved filters" apart from
 * "saved filters that happen to equal the defaults".
 */
export const parseRecipeListFilterValues = (
  carrier: unknown,
): Partial<RecipeListFilterValues> | undefined => {
  if (!isRecord(carrier) || !isRecord(carrier['recipeListFilters'])) {
    return undefined;
  }
  const raw = carrier['recipeListFilters'];
  const values: Partial<RecipeListFilterValues> = {};
  const stringFields = [
    'search',
    'ingredient',
    'minCalories',
    'maxCalories',
    'minSatiety',
    'maxSatiety',
  ] as const;
  for (const field of stringFields) {
    if (typeof raw[field] === 'string') {
      values[field] = raw[field];
    }
  }
  if (
    typeof raw['statusFilter'] === 'string' &&
    STATUS_FILTER_VALUES.includes(
      raw['statusFilter'] as RecipeStatusFilterValue,
    )
  ) {
    values.statusFilter = raw['statusFilter'] as RecipeStatusFilterValue;
  }
  if (
    typeof raw['sort'] === 'string' &&
    SORT_VALUES.includes(raw['sort'] as RecipeListSort)
  ) {
    values.sort = raw['sort'] as RecipeListSort;
  }
  if (
    typeof raw['sortDir'] === 'string' &&
    SORT_DIR_VALUES.includes(raw['sortDir'] as RecipeListSortDir)
  ) {
    values.sortDir = raw['sortDir'] as RecipeListSortDir;
  }
  return values;
};

export type FilterFieldState = {
  search: string;
  setSearch: (value: string) => void;
  statusFilter: RecipeStatusFilterValue;
  setStatusFilter: (value: RecipeStatusFilterValue) => void;
  ingredient: string;
  setIngredient: (value: string) => void;
  minCalories: string;
  setMinCalories: (value: string) => void;
  maxCalories: string;
  setMaxCalories: (value: string) => void;
  minSatiety: string;
  setMinSatiety: (value: string) => void;
  maxSatiety: string;
  setMaxSatiety: (value: string) => void;
  sort: RecipeListSort;
  setSort: (value: RecipeListSort) => void;
  sortDir: RecipeListSortDir;
  setSortDir: (value: RecipeListSortDir) => void;
};

/** State bag for list filter form fields. */
// eslint-disable-next-line max-lines-per-function -- many useState pairs for filter controls
export const useFilterFieldState = (
  defaultSort: RecipeListSort,
  initialValues?: Partial<RecipeListFilterValues>,
): FilterFieldState => {
  const [search, setSearch] = useState(initialValues?.search ?? '');
  const [statusFilter, setStatusFilter] = useState<RecipeStatusFilterValue>(
    initialValues?.statusFilter ?? RECIPE_STATUS_FILTER_ALL,
  );
  const [ingredient, setIngredient] = useState(initialValues?.ingredient ?? '');
  const [minCalories, setMinCalories] = useState(
    initialValues?.minCalories ?? '',
  );
  const [maxCalories, setMaxCalories] = useState(
    initialValues?.maxCalories ?? '',
  );
  const [minSatiety, setMinSatiety] = useState(initialValues?.minSatiety ?? '');
  const [maxSatiety, setMaxSatiety] = useState(initialValues?.maxSatiety ?? '');
  const [sort, setSort] = useState<RecipeListSort>(
    initialValues?.sort ?? defaultSort,
  );
  const [sortDir, setSortDir] = useState<RecipeListSortDir>(
    initialValues?.sortDir ?? 'desc',
  );

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    ingredient,
    setIngredient,
    minCalories,
    setMinCalories,
    maxCalories,
    setMaxCalories,
    minSatiety,
    setMinSatiety,
    maxSatiety,
    setMaxSatiety,
    sort,
    setSort,
    sortDir,
    setSortDir,
  };
};

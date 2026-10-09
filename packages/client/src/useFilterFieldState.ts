import type {RecipeListSort, RecipeListSortDir} from '@eciperay/types';
import {useState} from 'react';

import {RECIPE_STATUS_FILTER_ALL} from './recipeStatusCopy.js';
import type {RecipeStatusFilterValue} from './ui/recipeListFilterControls.js';

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
): FilterFieldState => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RecipeStatusFilterValue>(
    RECIPE_STATUS_FILTER_ALL,
  );
  const [ingredient, setIngredient] = useState('');
  const [minCalories, setMinCalories] = useState('');
  const [maxCalories, setMaxCalories] = useState('');
  const [minSatiety, setMinSatiety] = useState('');
  const [maxSatiety, setMaxSatiety] = useState('');
  const [sort, setSort] = useState<RecipeListSort>(defaultSort);
  const [sortDir, setSortDir] = useState<RecipeListSortDir>('desc');

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

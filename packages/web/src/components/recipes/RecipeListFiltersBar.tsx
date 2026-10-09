import type {RecipeListFilterControls} from '@eciperay/client';

import {SearchField} from '../ui/SearchField.js';
import {SelectField} from '../ui/SelectField.js';

import {RecipeListNumberFilter} from './RecipeListNumberFilter.js';
import {RecipeListStatusIngredientFilters} from './RecipeListStatusIngredientFilters.js';

const SORT_OPTIONS = [
  {value: 'newest', label: 'Newest'},
  {value: 'rating', label: 'Rating'},
  {value: 'satiety', label: 'Satiety'},
  {value: 'calories', label: 'Calories'},
] as const;

const SORT_DIR_OPTIONS = [
  {value: 'desc', label: 'High to low'},
  {value: 'asc', label: 'Low to high'},
] as const;

export const RecipeListFiltersBar = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  ingredient,
  onIngredientChange,
  minCalories,
  onMinCaloriesChange,
  maxCalories,
  onMaxCaloriesChange,
  minSatiety,
  onMinSatietyChange,
  maxSatiety,
  onMaxSatietyChange,
  sort,
  onSortChange,
  sortDir,
  onSortDirChange,
  showStatusFilter = true,
  searchPlaceholder = 'Search recipes…',
}: RecipeListFilterControls & {searchPlaceholder?: string}) => (
  <div className="mb-4 space-y-3">
    <SearchField
      value={search}
      onChange={onSearchChange}
      placeholder={searchPlaceholder}
    />
    <RecipeListStatusIngredientFilters
      statusFilter={statusFilter}
      onStatusFilterChange={onStatusFilterChange}
      ingredient={ingredient}
      onIngredientChange={onIngredientChange}
      showStatusFilter={showStatusFilter}
    />
    <div
      className="
        grid grid-cols-2 gap-3
        sm:grid-cols-4
      "
    >
      <RecipeListNumberFilter
        id="min-calories"
        label="Min cal"
        value={minCalories}
        onChange={onMinCaloriesChange}
      />
      <RecipeListNumberFilter
        id="max-calories"
        label="Max cal"
        value={maxCalories}
        onChange={onMaxCaloriesChange}
      />
      <RecipeListNumberFilter
        id="min-satiety"
        label="Min satiety"
        value={minSatiety}
        onChange={onMinSatietyChange}
      />
      <RecipeListNumberFilter
        id="max-satiety"
        label="Max satiety"
        value={maxSatiety}
        onChange={onMaxSatietyChange}
      />
    </div>
    <div
      className="
        grid gap-3
        sm:grid-cols-2
      "
    >
      <SelectField
        label="Sort by"
        value={sort}
        options={[...SORT_OPTIONS]}
        onChange={next => {
          onSortChange(next as typeof sort);
        }}
      />
      <SelectField
        label="Order"
        value={sortDir}
        options={[...SORT_DIR_OPTIONS]}
        onChange={next => {
          onSortDirChange(next as typeof sortDir);
        }}
      />
    </div>
  </div>
);

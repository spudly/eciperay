import {
  RECIPE_STATUS_FILTER_ALL,
  RECIPE_STATUS_FILTER_LABEL,
  RECIPE_STATUS_LABELS,
  RECIPE_STATUS_OPTIONS,
  type RecipeListFilterControls,
} from '@eciperay/client';

import {SelectField} from '../ui/SelectField.js';

export const RecipeListStatusIngredientFilters = ({
  statusFilter,
  onStatusFilterChange,
  ingredient,
  onIngredientChange,
  showStatusFilter,
}: Pick<
  RecipeListFilterControls,
  | 'statusFilter'
  | 'onStatusFilterChange'
  | 'ingredient'
  | 'onIngredientChange'
  | 'showStatusFilter'
>) => (
  <div
    className="
      grid gap-3
      sm:grid-cols-2
    "
  >
    {showStatusFilter && statusFilter !== undefined && onStatusFilterChange ? (
      <SelectField
        label={RECIPE_STATUS_FILTER_LABEL}
        value={statusFilter}
        options={[
          {value: RECIPE_STATUS_FILTER_ALL, label: 'All statuses'},
          ...RECIPE_STATUS_OPTIONS.map(status => ({
            value: status,
            label: RECIPE_STATUS_LABELS[status],
          })),
        ]}
        onChange={next => {
          onStatusFilterChange(next as typeof statusFilter);
        }}
      />
    ) : null}
    <label className="block">
      <span className="mbe-1 block text-sm font-medium text-gray-700">
        Ingredient
      </span>
      <input
        className="
          rounded-xl border border-gray-200 bg-field px-4 py-3 text-base
          inline-full
        "
        value={ingredient}
        onChange={event => {
          onIngredientChange(event.target.value);
        }}
        placeholder="e.g. chicken"
      />
    </label>
  </div>
);

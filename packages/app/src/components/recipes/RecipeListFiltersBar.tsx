import {
  RECIPE_STATUS_FILTER_ALL,
  RECIPE_STATUS_FILTER_LABEL,
  RECIPE_STATUS_LABELS,
  RECIPE_STATUS_OPTIONS,
  type RecipeListFilterControls,
} from '@eciperay/client';
import {Text, TextInput, View} from 'react-native';

import {SearchField} from '../ui/SearchField';
import {SelectField} from '../ui/SelectField';

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

const NumberFilter = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <View className="mbe-2 flex-1">
    <Text className="mbe-1 text-sm font-medium text-gray-700">{label}</Text>
    <TextInput
      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-base"
      keyboardType="numeric"
      value={value}
      onChangeText={onChange}
    />
  </View>
);

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
}: RecipeListFilterControls) => (
  <View>
    <SearchField
      value={search}
      onChange={onSearchChange}
    />
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
    <View className="mbe-2">
      <Text className="mbe-1 text-sm font-medium text-gray-700">Ingredient</Text>
      <TextInput
        className="
          rounded-lg border border-gray-200 bg-white px-3 py-2 text-base
        "
        value={ingredient}
        onChangeText={onIngredientChange}
        placeholder="e.g. chicken"
      />
    </View>
    <View className="flex-row gap-2">
      <NumberFilter
        label="Min cal"
        value={minCalories}
        onChange={onMinCaloriesChange}
      />
      <NumberFilter
        label="Max cal"
        value={maxCalories}
        onChange={onMaxCaloriesChange}
      />
    </View>
    <View className="flex-row gap-2">
      <NumberFilter
        label="Min satiety"
        value={minSatiety}
        onChange={onMinSatietyChange}
      />
      <NumberFilter
        label="Max satiety"
        value={maxSatiety}
        onChange={onMaxSatietyChange}
      />
    </View>
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
  </View>
);

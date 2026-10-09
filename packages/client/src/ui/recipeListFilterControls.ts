import type {
  RecipeListSort,
  RecipeListSortDir,
  RecipeStatus,
} from '@eciperay/types';

export type RecipeStatusFilterValue = 'all' | RecipeStatus;

export type RecipeListFilterControls = {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter?: RecipeStatusFilterValue;
  onStatusFilterChange?: (value: RecipeStatusFilterValue) => void;
  ingredient: string;
  onIngredientChange: (value: string) => void;
  minCalories: string;
  onMinCaloriesChange: (value: string) => void;
  maxCalories: string;
  onMaxCaloriesChange: (value: string) => void;
  minSatiety: string;
  onMinSatietyChange: (value: string) => void;
  maxSatiety: string;
  onMaxSatietyChange: (value: string) => void;
  sort: RecipeListSort;
  onSortChange: (value: RecipeListSort) => void;
  sortDir: RecipeListSortDir;
  onSortDirChange: (value: RecipeListSortDir) => void;
  showStatusFilter?: boolean;
};

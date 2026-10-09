import type {RecipeListFilterControls} from './ui/recipeListFilterControls.js';

const noop = () => {
  void 0;
};

/** No-op filter controls for component demos and tests. */
export const demoRecipeListFilters = (): RecipeListFilterControls => ({
  search: '',
  onSearchChange: noop,
  ingredient: '',
  onIngredientChange: noop,
  minCalories: '',
  onMinCaloriesChange: noop,
  maxCalories: '',
  onMaxCaloriesChange: noop,
  minSatiety: '',
  onMinSatietyChange: noop,
  maxSatiety: '',
  onMaxSatietyChange: noop,
  sort: 'newest',
  onSortChange: noop,
  sortDir: 'desc',
  onSortDirChange: noop,
});

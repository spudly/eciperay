import type {RecipeLifecycleStatus} from '@eciperay/types';

const LOCKED_STATUSES = new Set<RecipeLifecycleStatus>([
  'perfected',
  'abandoned',
]);

export const isRecipeEditable = (status: RecipeLifecycleStatus): boolean => {
  return !LOCKED_STATUSES.has(status);
};

export const recipeEditBlockedError = (): string => {
  return 'Recipe cannot be modified in its current lifecycle status';
};

import type {RecipeStatus} from '@eciperay/types';

const LOCKED_STATUSES = new Set<RecipeStatus>(['perfected', 'abandoned']);

export const isRecipeEditable = (status: RecipeStatus): boolean => {
  return !LOCKED_STATUSES.has(status);
};

export const recipeEditBlockedError = (): string => {
  return 'Recipe cannot be modified in its current status';
};

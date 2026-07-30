import type {RecipeStatus} from '@eciperay/types';

export const RECIPE_STATUS_OPTIONS: RecipeStatus[] = [
  'idea',
  'evolving',
  'perfected',
  'abandoned',
];

export const RECIPE_STATUS_LABELS: Record<RecipeStatus, string> = {
  idea: 'Idea',
  evolving: 'Evolving',
  perfected: 'Perfected',
  abandoned: 'Abandoned',
};

export const RECIPE_STATUS_FILTER_ALL = 'all';
export const RECIPE_STATUS_FILTER_LABEL = 'Status';

export const normalizeRecipeStatus = (
  status?: RecipeStatus | null,
): RecipeStatus => {
  if (status && status in RECIPE_STATUS_LABELS) {
    return status;
  }
  return 'idea';
};

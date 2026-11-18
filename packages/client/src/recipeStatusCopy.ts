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

/**
 * The status options for the recipe-list status filter and the recipe form's
 * status field, with labels supplied by the caller. The hosts resolve the
 * labels from their Lingui catalogs (#465 tranche 10: explicit ids
 * `recipeStatus.idea` / `recipeStatus.evolving` / `recipeStatus.perfected` /
 * `recipeStatus.abandoned`) and pass them in; this module stays locale-free (it
 * has no Lingui dependency), and `RECIPE_STATUS_LABELS` remains the en-US
 * default for non-React callers and for `normalizeRecipeStatus`'s key check.
 */
export const recipeStatusOptions = (
  labels: Record<RecipeStatus, string> = RECIPE_STATUS_LABELS,
): {value: RecipeStatus; label: string}[] =>
  RECIPE_STATUS_OPTIONS.map(value => ({value, label: labels[value]}));

export const normalizeRecipeStatus = (
  status?: RecipeStatus | null,
): RecipeStatus => {
  if (status && status in RECIPE_STATUS_LABELS) {
    return status;
  }
  return 'idea';
};

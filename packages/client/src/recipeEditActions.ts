import type {RecipeStatus, RecipeVersionSummary} from '@eciperay/types';

export const isRecipeStatusEditable = (status: RecipeStatus): boolean =>
  status !== 'perfected' && status !== 'abandoned';

/**
 * A Perfected recipe's active version is locked, so the only way to change the
 * recipe is to create a new draft version from it (#264). Abandoned recipes
 * stay terminal: no draft can be created from them.
 */
export const canCreateDraftVersion = (status: RecipeStatus): boolean =>
  status === 'perfected';

export const canEditDraftVersion = (
  versionId: string,
  versions: RecipeVersionSummary[],
): boolean => versions.find(v => v.id === versionId)?.isEditable ?? false;

export const canEditActiveRecipeMetadata = (
  status: RecipeStatus,
  displayVersionId: string,
  activeVersionId: string,
  versions: RecipeVersionSummary[],
): boolean => {
  if (!isRecipeStatusEditable(status)) {
    return false;
  }
  if (displayVersionId !== activeVersionId) {
    return false;
  }
  const version = versions.find(v => v.id === displayVersionId);
  if (!version || version.isEditable) {
    return false;
  }
  return version.isContentLocked;
};

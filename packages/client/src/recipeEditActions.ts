import type {RecipeStatus, RecipeVersionSummary} from '@eciperay/types';

export const isRecipeStatusEditable = (status: RecipeStatus): boolean =>
  status !== 'perfected' && status !== 'abandoned';

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

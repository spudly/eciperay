import type {
  RecipeLifecycleStatus,
  RecipeVersionSummary,
} from '@eciperay/types';

export const isRecipeLifecycleEditable = (
  lifecycleStatus: RecipeLifecycleStatus,
): boolean =>
  lifecycleStatus !== 'perfected' && lifecycleStatus !== 'abandoned';

export const canEditDraftVersion = (
  versionId: string,
  versions: RecipeVersionSummary[],
): boolean => versions.find(v => v.id === versionId)?.isEditable ?? false;

export const canEditActiveRecipeMetadata = (
  lifecycleStatus: RecipeLifecycleStatus,
  displayVersionId: string,
  activeVersionId: string,
  versions: RecipeVersionSummary[],
): boolean => {
  if (!isRecipeLifecycleEditable(lifecycleStatus)) {
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

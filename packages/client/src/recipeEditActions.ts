import type {RecipeVersionSummary} from '@eciperay/types';

/**
 * The versions a recipe's detail page offers for direct activation (#417),
 * mirroring the server's rule (activateVersion): candidates (the cook-log
 * path) plus previously active (archived) versions, which stay
 * re-activatable. Both detail hosts (web and app) call this so the rule
 * cannot drift between them.
 */
export const activationCandidates = (
  versions: RecipeVersionSummary[],
): RecipeVersionSummary[] =>
  versions.filter(
    v => v.derivedRole === 'candidate' || v.derivedRole === 'archived',
  );

export const canEditDraftVersion = (
  versionId: string,
  versions: RecipeVersionSummary[],
): boolean => versions.find(v => v.id === versionId)?.isEditable ?? false;

export const canEditActiveRecipeMetadata = (
  displayVersionId: string,
  activeVersionId: string,
  versions: RecipeVersionSummary[],
): boolean => {
  if (displayVersionId !== activeVersionId) {
    return false;
  }
  const version = versions.find(v => v.id === displayVersionId);
  if (!version || version.isEditable) {
    return false;
  }
  return version.isContentLocked;
};

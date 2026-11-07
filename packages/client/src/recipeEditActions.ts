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

/**
 * The versions a recipe's detail page offers for direct activation (#417),
 * mirroring the server's rule (activateVersion): candidates (the cook-log path)
 * plus previously active (archived) versions, which stay re-activatable, plus —
 * on a Perfected recipe — every other saved version. An Abandoned recipe is
 * terminal: the server rejects activation in that status, so no version is
 * offered. Both detail hosts (web and app) call this so the rule cannot drift
 * between them.
 */
export const activationCandidates = (
  status: RecipeStatus,
  versions: RecipeVersionSummary[],
): RecipeVersionSummary[] => {
  if (status === 'abandoned') {
    return [];
  }
  return versions.filter(
    v =>
      v.derivedRole === 'candidate' ||
      v.derivedRole === 'archived' ||
      (status === 'perfected' && v.derivedRole !== 'active'),
  );
};

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

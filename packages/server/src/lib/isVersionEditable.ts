import type {RecipeVersionDetail} from '@eciperay/types';

export const versionEditBlockedError = () =>
  'This version can no longer be edited';

export const versionContentLockedError = () =>
  'Ingredients and instructions are locked on this version';

export const isVersionEditable = (
  version: Pick<
    RecipeVersionDetail,
    'derivedRole' | 'childVersionCount' | 'cookLogCount'
  >,
): boolean => {
  if (version.derivedRole !== 'draft') {
    return false;
  }
  if (version.cookLogCount > 0) {
    return false;
  }
  if (version.childVersionCount > 0) {
    return false;
  }
  return true;
};

export const isVersionContentLocked = (
  version: Pick<
    RecipeVersionDetail,
    'derivedRole' | 'childVersionCount' | 'cookLogCount'
  >,
): boolean => !isVersionEditable(version);

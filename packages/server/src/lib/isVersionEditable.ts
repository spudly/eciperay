import type {RecipeStatus, RecipeVersionDetail} from '@eciperay/types';

import {isRecipeEditable} from './assertRecipeEditable.js';

export const versionEditBlockedError = () =>
  'This version can no longer be edited';

export const versionContentLockedError = () =>
  'Ingredients and instructions are locked on this version';

export const isVersionEditable = (
  version: Pick<
    RecipeVersionDetail,
    'derivedRole' | 'childVersionCount' | 'cookLogCount'
  >,
  status: RecipeStatus,
): boolean => {
  if (!isRecipeEditable(status)) {
    return false;
  }
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
  status: RecipeStatus,
): boolean => !isVersionEditable(version, status);

import type {RecipeLifecycleStatus, RecipeVersionDetail} from '@eciperay/types';

import {isRecipeEditable} from './assertRecipeEditable.js';

export const versionEditBlockedError = () =>
  'This version can no longer be edited';

export const isVersionEditable = (
  version: Pick<
    RecipeVersionDetail,
    'derivedRole' | 'childVersionCount' | 'cookLogCount'
  >,
  lifecycleStatus: RecipeLifecycleStatus,
): boolean => {
  if (!isRecipeEditable(lifecycleStatus)) {
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

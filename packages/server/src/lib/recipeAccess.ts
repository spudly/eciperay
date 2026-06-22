import type {RecipeVisibility} from '@eciperay/types';

import {verifyShareToken} from './shareToken.js';

export type RecipeAccessRecord = {
  ownerUserId: string;
  visibility: RecipeVisibility;
  shareTokenHash: string | null;
};

export type ReadAccessOptions = {
  userId?: string;
  shareToken?: string;
  hasShareGrant?: boolean;
};

export const canReadRecipe = (
  recipe: RecipeAccessRecord,
  opts: ReadAccessOptions = {},
): boolean => {
  const {userId, shareToken, hasShareGrant} = opts;

  if (userId && userId === recipe.ownerUserId) {
    return true;
  }

  if (recipe.visibility === 'private') {
    return false;
  }

  if (recipe.visibility === 'public') {
    return true;
  }

  if (hasShareGrant) {
    return true;
  }

  if (shareToken) {
    return verifyShareToken(shareToken, recipe.shareTokenHash);
  }

  return false;
};

export const canWriteRecipe = (
  recipe: Pick<RecipeAccessRecord, 'ownerUserId'>,
  userId?: string,
): boolean => {
  return Boolean(userId && userId === recipe.ownerUserId);
};

export const toRecipeAccessRecord = (row: {
  user_id: string;
  visibility: RecipeVisibility;
  share_token_hash: string | null;
}): RecipeAccessRecord => ({
  ownerUserId: row.user_id,
  visibility: row.visibility,
  shareTokenHash: row.share_token_hash,
});

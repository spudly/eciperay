import type {RecipeVisibility} from '@eciperay/types';

import {verifyShareToken} from './shareToken.js';

export type RecipeAccessRecord = {
  ownerUserId: string;
  visibility: RecipeVisibility;
  shareTokenHash: string | null;
  // Every issued share-link token hash (#534, migration 027): a link stays
  // valid until rotation or a visibility reset clears the issued set.
  shareTokenHashes?: readonly string[];
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

  if (recipe.visibility === 'public') {
    return true;
  }

  // Private and unlisted recipes alike (#534): a valid share token is a
  // bearer link — it grants read access even when the recipe is private,
  // and an existing share grant does the same. Without either, a private
  // recipe stays closed to everyone but its owner.
  if (hasShareGrant) {
    return true;
  }

  if (shareToken) {
    if (verifyShareToken(shareToken, recipe.shareTokenHash)) {
      return true;
    }
    return (recipe.shareTokenHashes ?? []).some(hash =>
      verifyShareToken(shareToken, hash),
    );
  }

  return false;
};

export type PublicReadDenial = 'not_found' | 'forbidden';

export const resolvePublicRecipeAccess = (
  recipe: RecipeAccessRecord | null,
  opts: ReadAccessOptions = {},
): PublicReadDenial | null => {
  if (!recipe) {
    return 'not_found';
  }

  if (!canReadRecipe(recipe, opts)) {
    // A private recipe the caller cannot read is indistinguishable from
    // a missing one — never leak that it exists. A valid share token (or
    // an existing grant) is the only way in for a non-owner (#534).
    return recipe.visibility === 'private' ? 'not_found' : 'forbidden';
  }

  return null;
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
  share_token_hashes?: readonly string[] | null;
}): RecipeAccessRecord => ({
  ownerUserId: row.user_id,
  visibility: row.visibility,
  shareTokenHash: row.share_token_hash,
  ...(row.share_token_hashes ? {shareTokenHashes: row.share_token_hashes} : {}),
});

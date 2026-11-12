import type {PublicRecipeResponse} from '@eciperay/types';

import {makeRecipeDetail} from './recipe.js';

export const makePublicRecipeResponse = (
  overrides: Partial<PublicRecipeResponse> = {},
): PublicRecipeResponse => {
  const {userId, ...detail} = makeRecipeDetail();
  void userId;
  return {
    recipe: {...detail, authorDisplayName: null},
    canonicalSlug: detail.slug,
    communityRating: null,
    viewerRating: null,
    viewerRatingIsStale: false,
    ...overrides,
  };
};

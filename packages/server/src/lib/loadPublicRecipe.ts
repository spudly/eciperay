import type {PublicRecipeResponse} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';
import {GET_PUBLIC_RECIPE_DETAIL_SQL} from '../routes/recipes/sqlConstants.js';

import {buildRecipeDetailWithRatings} from './buildRecipeDetailWithRatings.js';
import {mapRowToPublicRecipeDetail} from './mapRowToRecipeDetail.js';
import {
  resolvePublicRecipeAccess,
  toRecipeAccessRecord,
  type PublicReadDenial,
} from './recipeAccess.js';
import {
  recordShareGrant,
  shouldAutoRecordShareGrant,
  userHasShareGrant,
} from './shareGrant.js';

type QueryFn = typeof defaultQuery;

export type LoadPublicRecipeResult =
  | {kind: 'ok'; body: PublicRecipeResponse}
  | {kind: 'denied'; denial: PublicReadDenial};

export type LoadPublicRecipeArgs = {
  id: string;
  requestedSlug?: string;
  shareToken?: string;
  userId?: string;
};

/**
 * The public-recipe data load, extracted from the HTTP handler (#304 SSR
 * Phase 0 spike) so a server-side renderer can load the exact same
 * view data through the server's own data access — no internal HTTP hop.
 * Behavior matches the handler it was extracted from: access resolution,
 * the auto-recorded share grant for signed-in non-owners, the canonical
 * slug / slug-mismatch flag, and the ratings view data.
 */
export const loadPublicRecipe = async (
  args: LoadPublicRecipeArgs,
  queryFn: QueryFn,
): Promise<LoadPublicRecipeResult> => {
  const {id, requestedSlug, shareToken, userId} = args;

  const result = await queryFn(GET_PUBLIC_RECIPE_DETAIL_SQL, [id]);
  const row = result.rows[0] as
    | Parameters<typeof mapRowToPublicRecipeDetail>[0]
    | undefined;

  if (!row) {
    return {kind: 'denied', denial: 'not_found'};
  }

  const accessRecord = toRecipeAccessRecord(row);
  const hasShareGrant = userId
    ? await userHasShareGrant(id, userId, queryFn)
    : false;

  const denial = resolvePublicRecipeAccess(accessRecord, {
    shareToken,
    userId,
    hasShareGrant,
  });

  if (denial !== null) {
    return {kind: 'denied', denial};
  }

  if (shouldAutoRecordShareGrant(userId, row.user_id)) {
    await recordShareGrant(id, userId, 'link', queryFn);
  }

  const recipe = mapRowToPublicRecipeDetail(row);
  const canonicalSlug = row.slug;
  const slugMismatch =
    requestedSlug !== undefined &&
    requestedSlug !== '' &&
    requestedSlug !== canonicalSlug;

  const ratings = await buildRecipeDetailWithRatings(row, userId, queryFn);

  const body: PublicRecipeResponse = {
    recipe,
    canonicalSlug,
    communityRating: ratings.communityRating,
    viewerRating: ratings.viewerRating,
    viewerRatingIsStale: ratings.viewerRatingIsStale,
    ...(slugMismatch ? {slugMismatch: true} : {}),
  };
  return {kind: 'ok', body};
};

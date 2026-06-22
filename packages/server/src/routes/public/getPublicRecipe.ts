import type {PublicRecipeResponse} from '@eciperay/types';
import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {buildRecipeDetailWithRatings} from '../../lib/buildRecipeDetailWithRatings.js';
import {getParam} from '../../lib/getParam.js';
import {getShareTokenFromQuery} from '../../lib/getShareTokenFromQuery.js';
import {mapRowToPublicRecipeDetail} from '../../lib/mapRowToRecipeDetail.js';
import {
  resolvePublicRecipeAccess,
  toRecipeAccessRecord,
} from '../../lib/recipeAccess.js';
import {
  recordShareGrant,
  shouldAutoRecordShareGrant,
  userHasShareGrant,
} from '../../lib/shareGrant.js';
import type {OptionalAuthedRequest} from '../../middleware/optionalAuth.js';
import {GET_PUBLIC_RECIPE_DETAIL_SQL} from '../recipes/sqlConstants.js';

type QueryFn = typeof defaultQuery;

export const getPublicRecipe = async (
  req: OptionalAuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const id = getParam(req, 'id');
  const requestedSlug =
    req.params['slug'] === undefined ? undefined : getParam(req, 'slug');

  const result = await queryFn(GET_PUBLIC_RECIPE_DETAIL_SQL, [id]);
  const row = result.rows[0] as
    | Parameters<typeof mapRowToPublicRecipeDetail>[0]
    | undefined;

  if (!row) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }

  const accessRecord = toRecipeAccessRecord(row);
  const hasShareGrant = req.userId
    ? await userHasShareGrant(id, req.userId, queryFn)
    : false;

  const denial = resolvePublicRecipeAccess(accessRecord, {
    shareToken: getShareTokenFromQuery(req),
    userId: req.userId,
    hasShareGrant,
  });

  if (denial === 'not_found') {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }

  if (denial === 'forbidden') {
    res.status(403).json({error: 'Recipe access denied'});
    return;
  }

  if (shouldAutoRecordShareGrant(req.userId, row.user_id)) {
    await recordShareGrant(id, req.userId, 'link', queryFn);
  }

  const recipe = mapRowToPublicRecipeDetail(row);
  const canonicalSlug = row.slug;
  const slugMismatch =
    requestedSlug !== undefined &&
    requestedSlug !== '' &&
    requestedSlug !== canonicalSlug;

  const ratings = await buildRecipeDetailWithRatings(row, req.userId, queryFn);

  const body: PublicRecipeResponse = {
    recipe,
    canonicalSlug,
    communityRating: ratings.communityRating,
    viewerRating: ratings.viewerRating,
    viewerRatingIsStale: ratings.viewerRatingIsStale,
    ...(slugMismatch ? {slugMismatch: true} : {}),
  };
  res.json(body);
};

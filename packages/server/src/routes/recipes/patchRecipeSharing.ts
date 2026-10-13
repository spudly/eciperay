import type {Response} from 'express';
import type {RecipeVisibility} from '@eciperay/types';

import {query as defaultQuery} from '../../db/query.js';
import type {EntitledRequest} from '../../middleware/loadEntitlement.js';
import {getParam} from '../../lib/getParam.js';
import {mapRowToRecipeDetail} from '../../lib/mapRowToRecipeDetail.js';
import {RecipeSharingPatchSchema, validate} from '../../lib/schemas.js';
import {generateShareToken, hashShareToken} from '../../lib/shareToken.js';

import {GET_RECIPE_DETAIL_SQL} from './queries.js';
import {getRecipeSharingRow, updateRecipeVisibility} from './versionQueries.js';

type QueryFn = typeof defaultQuery;

const isFirstPublish = (visibility: string): boolean =>
  visibility === 'private';

const resolveShareTokenHash = (
  nextVisibility: RecipeVisibility,
  currentHash: string | null,
): {hash: string | null; shareToken?: string} => {
  if (nextVisibility === 'private' || nextVisibility === 'public') {
    return {hash: null};
  }

  if (currentHash) {
    return {hash: currentHash};
  }

  const shareToken = generateShareToken();
  return {hash: hashShareToken(shareToken), shareToken};
};

export const patchRecipeSharing = async (
  req: EntitledRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(RecipeSharingPatchSchema, req, res);
  if (!body.ok) {
    return;
  }

  const nextVisibility = body.data.visibility;
  // Publishing (public/unlisted) is a Plus feature. Going back to private is
  // a privacy/revocation operation and is always allowed.
  if (
    (nextVisibility === 'public' || nextVisibility === 'unlisted') &&
    req.entitlement.plan === 'free'
  ) {
    res
      .status(403)
      .json({
        error: 'plan_required',
        requiredPlan: 'plus',
        plan: req.entitlement.plan,
      });
    return;
  }

  const recipeId = getParam(req, 'id');
  const sharing = await getRecipeSharingRow(recipeId, req.userId, queryFn);
  const row = sharing.rows[0];
  if (!row) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }

  const currentVisibility = row.visibility as RecipeVisibility;

  if (
    isFirstPublish(currentVisibility) &&
    (nextVisibility === 'unlisted' || nextVisibility === 'public') &&
    body.data.publishingConsent !== true
  ) {
    res
      .status(400)
      .json({
        error: 'Publishing consent is required before sharing this recipe',
      });
    return;
  }

  const {hash, shareToken} = resolveShareTokenHash(
    nextVisibility,
    row.share_token_hash,
  );

  const updated = await updateRecipeVisibility(
    {
      recipeId,
      userId: req.userId,
      visibility: nextVisibility,
      shareTokenHash: hash,
    },
    queryFn,
  );
  if (updated.rowCount === 0) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }

  const detail = await queryFn(GET_RECIPE_DETAIL_SQL, [recipeId, req.userId]);
  const detailRow = detail.rows[0];
  if (!detailRow) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }

  res.json({
    ...mapRowToRecipeDetail(
      detailRow as Parameters<typeof mapRowToRecipeDetail>[0],
    ),
    ...(shareToken ? {shareToken} : {}),
  });
};

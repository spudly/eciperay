import type {Response} from 'express';
import {z} from 'zod';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {getParam} from '../../lib/getParam.js';
import {buildRecipeDetailWithRatings} from '../../lib/buildRecipeDetailWithRatings.js';
import {loadIssuedShareTokenHashes} from '../../lib/issuedShareTokens.js';
import {
  canReadRecipe,
  toRecipeAccessRecord,
  withIssuedShareTokenHashes,
} from '../../lib/recipeAccess.js';
import {getShareTokenFromQuery} from '../../lib/getShareTokenFromQuery.js';
import {mapRowToRecipeDetail} from '../../lib/mapRowToRecipeDetail.js';
import {
  recordShareGrant,
  shouldAutoRecordShareGrant,
  userHasShareAccess,
} from '../../lib/shareGrant.js';
import {verifyShareToken} from '../../lib/shareToken.js';

import {GET_RECIPE_DETAIL_SQL} from './queries.js';

type QueryFn = typeof defaultQuery;

export const getRecipe = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const id = getParam(req, 'id');
  if (!z.uuid().safeParse(id).success) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  const result = await queryFn(GET_RECIPE_DETAIL_SQL, [id, req.userId]);
  const row = result.rows[0] as
    Parameters<typeof mapRowToRecipeDetail>[0] | undefined;
  if (!row) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }

  // Evaluate the same access inputs as the public route (#649, mirroring
  // loadPublicReadableRecipeRow): a signed-in viewer holding a share grant
  // (per-recipe or family), or arriving with a valid share token in the
  // `t` query param — checked against the current token hash and every
  // issued share-token hash (#534) — can read a shared recipe here too.
  // Without one of those, an unauthorized recipe gets the same 404 as a
  // missing one, so its existence never leaks.
  const shareToken = getShareTokenFromQuery(req);
  const accessRecord = withIssuedShareTokenHashes(
    toRecipeAccessRecord(row),
    shareToken ? await loadIssuedShareTokenHashes(id, queryFn) : [],
  );
  const hasShareAccess = await userHasShareAccess(id, req.userId, queryFn);
  if (
    !canReadRecipe(accessRecord, {
      userId: req.userId,
      shareToken,
      hasShareGrant: hasShareAccess,
    })
  ) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }

  // A valid share token presented by a signed-in non-owner becomes a
  // persistent share grant (mirroring the public route), so the token
  // context survives later in-app navigation that carries no token.
  const tokenIsValid =
    shareToken !== undefined &&
    (verifyShareToken(shareToken, accessRecord.shareTokenHash) ||
      (accessRecord.shareTokenHashes ?? []).some(hash =>
        verifyShareToken(shareToken, hash),
      ));
  if (
    tokenIsValid &&
    !hasShareAccess &&
    shouldAutoRecordShareGrant(req.userId, accessRecord.ownerUserId)
  ) {
    await recordShareGrant(id, req.userId, 'link', queryFn);
  }

  res.json(await buildRecipeDetailWithRatings(row, req.userId, queryFn));
};

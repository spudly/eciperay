import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {getParam} from '../../lib/getParam.js';
import {mapRowToRecipeDetail} from '../../lib/mapRowToRecipeDetail.js';
import {generateShareToken, hashShareToken} from '../../lib/shareToken.js';

import {
  clearIssuedShareTokens,
  recordIssuedShareToken,
} from '../../lib/issuedShareTokens.js';

import {GET_RECIPE_DETAIL_SQL} from './queries.js';
import {
  getRecipeSharingRow,
  updateRecipeShareTokenHash,
  type RecipeSharingRow,
} from './versionQueries.js';

type QueryFn = typeof defaultQuery;

/**
 * Rotates the recipe's share link (#534): every previously issued link stops
 * working (the issued-token set is cleared) and a fresh token is minted. The
 * hash write is guarded on the visibility read above, exactly like the
 * share-link mint — a concurrent visibility change is never overwritten.
 */
export const rotateRecipeShareToken = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const recipeId = getParam(req, 'id');
  const sharing = await getRecipeSharingRow(recipeId, req.userId, queryFn);
  let row: RecipeSharingRow | undefined = sharing.rows[0];
  if (!row) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }

  if (row.visibility !== 'unlisted' && row.visibility !== 'private') {
    res
      .status(409)
      .json({
        error:
          'Share links can only be rotated for private or unlisted recipes',
      });
    return;
  }

  const shareToken = generateShareToken();
  const tokenHash = hashShareToken(shareToken);
  let updated = await updateRecipeShareTokenHash(
    {
      recipeId,
      userId: req.userId,
      expectedVisibility: row.visibility,
      shareTokenHash: tokenHash,
    },
    queryFn,
  );
  if (updated.rowCount === 0) {
    const fresh = await getRecipeSharingRow(recipeId, req.userId, queryFn);
    row = fresh.rows[0];
    if (!row) {
      res.status(404).json({error: 'Recipe not found'});
      return;
    }
    if (row.visibility !== 'unlisted' && row.visibility !== 'private') {
      res
        .status(409)
        .json({
          error:
            'Share links can only be rotated for private or unlisted recipes',
        });
      return;
    }
    updated = await updateRecipeShareTokenHash(
      {
        recipeId,
        userId: req.userId,
        expectedVisibility: row.visibility,
        shareTokenHash: tokenHash,
      },
      queryFn,
    );
    if (updated.rowCount === 0) {
      res.status(409).json({error: 'Sharing changed — try again'});
      return;
    }
  }

  // Rotation is the explicit revocation: all previously issued links die,
  // and the fresh token becomes the only issued one.
  await clearIssuedShareTokens(recipeId, queryFn);
  await recordIssuedShareToken(recipeId, tokenHash, queryFn);

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
    shareToken,
  });
};

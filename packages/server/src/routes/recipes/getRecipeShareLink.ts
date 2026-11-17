import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {getParam} from '../../lib/getParam.js';
import {mapRowToRecipeDetail} from '../../lib/mapRowToRecipeDetail.js';
import {generateShareToken, hashShareToken} from '../../lib/shareToken.js';

import {GET_RECIPE_DETAIL_SQL} from './queries.js';
import {
  getRecipeSharingRow,
  insertRecipeShareToken,
  updateRecipeShareTokenHash,
  type RecipeSharingRow,
} from './versionQueries.js';

type QueryFn = typeof defaultQuery;

/**
 * Obtains a usable share link for the recipe's owner (#534).
 *
 * Public recipes need no token — the caller builds the plain permalink. For
 * private and unlisted recipes the link carries a share token. Every mint ADDS
 * a token (migration 027): links already sent keep working until the owner
 * explicitly rotates the link or resets visibility — sharing the same recipe
 * with a second person never revokes the first person's link. Visibility is
 * never changed — a private recipe stays private, and its link works through
 * the token-bearing public route only. Owner-only: the sharing row lookup is
 * scoped to the requesting user, so a non-owner gets a 404.
 *
 * The token-hash write is guarded on the visibility read above
 * (updateRecipeShareTokenHash): if visibility changed concurrently, the mint
 * retries once against the fresh row instead of writing the stale visibility
 * back, and never resurrects a token on a recipe that has since gone public.
 */
export const getRecipeShareLink = async (
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

  let shareToken: string | undefined;
  if (row.visibility !== 'public') {
    shareToken = generateShareToken();
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
      // Visibility moved under us — re-read once and act on the fresh row.
      const fresh = await getRecipeSharingRow(recipeId, req.userId, queryFn);
      row = fresh.rows[0];
      if (!row) {
        res.status(404).json({error: 'Recipe not found'});
        return;
      }
      if (row.visibility === 'public') {
        shareToken = undefined;
      } else {
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
    }
    if (shareToken) {
      await insertRecipeShareToken(recipeId, tokenHash, queryFn);
    }
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

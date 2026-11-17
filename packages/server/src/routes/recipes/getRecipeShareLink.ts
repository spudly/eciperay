import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {getParam} from '../../lib/getParam.js';
import {mapRowToRecipeDetail} from '../../lib/mapRowToRecipeDetail.js';
import {generateShareToken, hashShareToken} from '../../lib/shareToken.js';

import {GET_RECIPE_DETAIL_SQL} from './queries.js';
import {getRecipeSharingRow, updateRecipeVisibility} from './versionQueries.js';

type QueryFn = typeof defaultQuery;

/**
 * Obtains a usable share link for the recipe's owner (#534).
 *
 * Public recipes need no token — the caller builds the plain permalink. For
 * private and unlisted recipes the link carries a share token. Tokens are
 * hashed at rest, so the plaintext of an existing token cannot be handed back:
 * when the recipe already has a token this mints a fresh one (the previous link
 * stops working, exactly like an explicit rotation); when it has none, this is
 * the first mint. Visibility is never changed — a private recipe stays private,
 * and its link works through the token-bearing public route only. Owner-only:
 * the sharing row lookup is scoped to the requesting user, so a non-owner gets
 * a 404.
 */
export const getRecipeShareLink = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const recipeId = getParam(req, 'id');
  const sharing = await getRecipeSharingRow(recipeId, req.userId, queryFn);
  const row = sharing.rows[0];
  if (!row) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }

  let shareToken: string | undefined;
  if (row.visibility !== 'public') {
    shareToken = generateShareToken();
    const updated = await updateRecipeVisibility(
      {
        recipeId,
        userId: req.userId,
        visibility: row.visibility,
        shareTokenHash: hashShareToken(shareToken),
      },
      queryFn,
    );
    if (updated.rowCount === 0) {
      res.status(404).json({error: 'Recipe not found'});
      return;
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

import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {getParam} from '../../lib/getParam.js';
import {mapRowToRecipeDetail} from '../../lib/mapRowToRecipeDetail.js';
import {generateShareToken, hashShareToken} from '../../lib/shareToken.js';

import {GET_RECIPE_DETAIL_SQL} from './queries.js';
import {getRecipeSharingRow, updateRecipeVisibility} from './versionQueries.js';

type QueryFn = typeof defaultQuery;

export const rotateRecipeShareToken = async (
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

  if (row.visibility !== 'unlisted') {
    res
      .status(409)
      .json({error: 'Share links can only be rotated for unlisted recipes'});
    return;
  }

  const shareToken = generateShareToken();
  const updated = await updateRecipeVisibility(
    {
      recipeId,
      userId: req.userId,
      visibility: 'unlisted',
      shareTokenHash: hashShareToken(shareToken),
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
    shareToken,
  });
};

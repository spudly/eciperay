import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {mapRowToRecipeListItem} from '../../lib/mapRowToRecipeDetail.js';

import {LIST_SHARED_WITH_ME_SQL} from './sqlConstants.js';
import {parseListParams} from './listRecipes.js';

type QueryFn = typeof defaultQuery;

export const listSharedWithMe = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const {limit, offset} = parseListParams(req);
  const result = await queryFn(LIST_SHARED_WITH_ME_SQL, [
    req.userId,
    limit,
    offset,
  ]);
  res.json(
    result.rows.map(row =>
      mapRowToRecipeListItem(
        row as Parameters<typeof mapRowToRecipeListItem>[0],
      ),
    ),
  );
};

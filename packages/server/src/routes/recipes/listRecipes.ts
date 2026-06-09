import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {mapRowToRecipeListItem} from '../../lib/mapRowToRecipeDetail.js';

import {LIST_RECIPES_SQL} from './queries.js';

type QueryFn = typeof defaultQuery;

const DEFAULT_LIMIT = 20;

const parseListParams = (req: AuthedRequest) => ({
  limit: Number(req.query['limit'] ?? DEFAULT_LIMIT),
  offset: Number(req.query['offset'] ?? 0),
});

export const listRecipes = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const {limit, offset} = parseListParams(req);
  const result = await queryFn(LIST_RECIPES_SQL, [req.userId, limit, offset]);
  res.json(
    result.rows.map(row =>
      mapRowToRecipeListItem(
        row as Parameters<typeof mapRowToRecipeListItem>[0],
      ),
    ),
  );
};

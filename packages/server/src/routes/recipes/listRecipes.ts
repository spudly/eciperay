import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {mapRowToRecipeListItem} from '../../lib/mapRowToRecipeDetail.js';

import {
  filterBindValues,
  parseRecipeListFilterParams,
} from './listFilterParams.js';
import {buildListRecipesSql} from './sqlConstants.js';

type QueryFn = typeof defaultQuery;

export {
  DEFAULT_RECIPE_LIST_LIMIT,
  MAX_RECIPE_LIST_LIMIT,
  parseLimit,
  parseOffset,
  parseOptionalSearch,
  parseStatusFilter,
  parseRecipeListFilterParams as parseListParams,
} from './listFilterParams.js';

export const listRecipes = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const params = parseRecipeListFilterParams(req);
  if (params.status === 'invalid') {
    res.status(400).json({error: 'Invalid status filter'});
    return;
  }
  if (params.sort === 'invalid') {
    res.status(400).json({error: 'Invalid sort parameter'});
    return;
  }
  if (params.sortDir === 'invalid') {
    res.status(400).json({error: 'Invalid sortDir parameter'});
    return;
  }

  const result = await queryFn(
    buildListRecipesSql(params.sort, params.sortDir),
    [
      req.userId,
      params.limit,
      params.offset,
      params.search,
      params.status,
      ...filterBindValues(params),
    ],
  );
  res.json(
    result.rows.map(row =>
      mapRowToRecipeListItem(
        row as Parameters<typeof mapRowToRecipeListItem>[0],
      ),
    ),
  );
};

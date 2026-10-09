import type {Response, Request} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {mapRowToPublicRecipeDiscoveryItem} from '../../lib/mapRowToRecipeDetail.js';
import {
  filterBindValues,
  parseRecipeListFilterParams,
} from '../recipes/listFilterParams.js';
import {buildListPublicRecipesSql} from '../recipes/sqlConstants.js';

type QueryFn = typeof defaultQuery;

export const listPublicRecipes = async (
  req: Request,
  res: Response,
  queryFn: QueryFn,
) => {
  const params = parseRecipeListFilterParams(req);
  if (params.sort === 'invalid') {
    res.status(400).json({error: 'Invalid sort parameter'});
    return;
  }
  if (params.sortDir === 'invalid') {
    res.status(400).json({error: 'Invalid sortDir parameter'});
    return;
  }
  if (params.status === 'invalid') {
    res.status(400).json({error: 'Invalid status filter'});
    return;
  }

  const result = await queryFn(
    buildListPublicRecipesSql(params.sort, params.sortDir),
    [
      params.limit,
      params.offset,
      params.search,
      params.status,
      ...filterBindValues(params),
    ],
  );
  res.json(
    result.rows.map(row =>
      mapRowToPublicRecipeDiscoveryItem(
        row as Parameters<typeof mapRowToPublicRecipeDiscoveryItem>[0],
      ),
    ),
  );
};

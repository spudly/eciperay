import type {PublicRecipeDiscoverySort} from '@eciperay/types';
import type {Request, Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import {mapRowToPublicRecipeDiscoveryItem} from '../../lib/mapRowToRecipeDetail.js';
import {parseListParams} from '../recipes/listRecipes.js';
import {LIST_PUBLIC_RECIPES_SQL} from '../recipes/sqlConstants.js';

type QueryFn = typeof defaultQuery;

export const parseDiscoverySort = (
  value?: unknown,
): PublicRecipeDiscoverySort | null => {
  if (value === undefined || value === 'newest') {
    return 'newest';
  }
  if (value === 'rating') {
    return 'rating';
  }
  return null;
};

export const listPublicRecipes = async (
  req: Request,
  res: Response,
  queryFn: QueryFn,
) => {
  const sort = parseDiscoverySort(req.query['sort']);
  if (!sort) {
    res.status(400).json({error: 'Invalid sort parameter'});
    return;
  }

  const {limit, offset, search} = parseListParams(req);
  void sort;
  const result = await queryFn(LIST_PUBLIC_RECIPES_SQL, [
    limit,
    offset,
    search,
  ]);
  res.json(
    result.rows.map(row =>
      mapRowToPublicRecipeDiscoveryItem(
        row as Parameters<typeof mapRowToPublicRecipeDiscoveryItem>[0],
      ),
    ),
  );
};

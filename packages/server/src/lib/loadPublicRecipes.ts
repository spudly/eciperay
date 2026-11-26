import type {PublicRecipeDiscoveryItem} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';
import {
  buildSearchQuerySql,
  filterBindValues,
  parseRecipeListFilterParams,
} from '../routes/recipes/listFilterParams.js';
import {buildListPublicRecipesSql} from '../routes/recipes/sqlConstants.js';

import {mapRowToPublicRecipeDiscoveryItem} from './mapRowToRecipeDetail.js';

type QueryFn = typeof defaultQuery;

/**
 * The public discovery feed's first page, loaded through the server's own data
 * access for the /recipes SSR render (#622) — no internal HTTP hop. It mirrors
 * the anonymous listPublicRecipes handler exactly: same SQL builder, same
 * filter parsing, with the client's first-page size (RECIPE_LIST_PAGE_SIZE =
 * 20, sort newest) so the server-rendered first paint and the client's first
 * query agree.
 */
export const loadPublicRecipes = async (
  queryFn: QueryFn = defaultQuery,
): Promise<PublicRecipeDiscoveryItem[]> => {
  const params = parseRecipeListFilterParams({query: {limit: '20'}});
  if (params.sort === 'invalid' || params.sortDir === 'invalid') {
    return [];
  }
  const baseValues = [
    params.limit,
    params.offset,
    ...filterBindValues(params),
  ];
  const searchQuerySql = buildSearchQuerySql(
    params.searchQuery,
    baseValues.length + 1,
    'public',
  );
  const result = await queryFn(
    buildListPublicRecipesSql(params.sort, params.sortDir, searchQuerySql.sql),
    [...baseValues, ...searchQuerySql.values],
  );
  return result.rows.map(row =>
    mapRowToPublicRecipeDiscoveryItem(
      row as Parameters<typeof mapRowToPublicRecipeDiscoveryItem>[0],
    ),
  );
};

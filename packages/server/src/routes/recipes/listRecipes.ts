import type {RecipeStatus} from '@eciperay/types';
import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {mapRowToRecipeListItem} from '../../lib/mapRowToRecipeDetail.js';

import {LIST_RECIPES_SQL} from './queries.js';

type QueryFn = typeof defaultQuery;

export const DEFAULT_RECIPE_LIST_LIMIT = 100;
export const MAX_RECIPE_LIST_LIMIT = 500;

const parseOptionalSearch = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseLimit = (value: unknown): number => {
  const parsed = Number(value ?? DEFAULT_RECIPE_LIST_LIMIT);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_RECIPE_LIST_LIMIT;
  }
  return Math.min(parsed, MAX_RECIPE_LIST_LIMIT);
};

const parseOffset = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
};

type ListRecipesRequest = Pick<AuthedRequest, 'query'>;

const STATUS_FILTERS = [
  'idea',
  'evolving',
  'perfected',
  'abandoned',
] as const satisfies readonly RecipeStatus[];

export const parseStatusFilter = (
  value: unknown,
): RecipeStatus | null | 'invalid' => {
  if (value === undefined || value === '') {
    return null;
  }
  if (
    typeof value === 'string' &&
    (STATUS_FILTERS as readonly string[]).includes(value)
  ) {
    return value as RecipeStatus;
  }
  return 'invalid';
};

export const parseListParams = (req: ListRecipesRequest) => ({
  limit: parseLimit(req.query['limit']),
  offset: parseOffset(req.query['offset']),
  search: parseOptionalSearch(req.query['search']),
  status: parseStatusFilter(req.query['status']),
});

export const listRecipes = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const {limit, offset, search, status} = parseListParams(req);
  if (status === 'invalid') {
    res.status(400).json({error: 'Invalid status filter'});
    return;
  }
  const result = await queryFn(LIST_RECIPES_SQL, [
    req.userId,
    limit,
    offset,
    search,
    status,
  ]);
  res.json(
    result.rows.map(row =>
      mapRowToRecipeListItem(
        row as Parameters<typeof mapRowToRecipeListItem>[0],
      ),
    ),
  );
};

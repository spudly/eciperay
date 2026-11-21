import type {
  RecipeListSort,
  RecipeListSortDir,
  RecipeStatus,
} from '@eciperay/types';

import {parseSearchSyntax, type ParsedSearchQuery} from './searchQuery.js';

export {
  buildSearchQuerySql,
  escapeLikePattern,
  FUZZY_MIN_WORD_LENGTH,
  FUZZY_SIMILARITY_THRESHOLD,
  isFuzzyEligible,
  parseSearchSyntax,
  relevanceScoreSql,
  type ParsedSearchQuery,
  type SearchScope,
} from './searchQuery.js';

export const DEFAULT_RECIPE_LIST_LIMIT = 100;
export const MAX_RECIPE_LIST_LIMIT = 500;

const STATUS_FILTERS = [
  'idea',
  'evolving',
  'perfected',
  'abandoned',
] as const satisfies readonly RecipeStatus[];

const SORT_VALUES = [
  'newest',
  'rating',
  'satiety',
  'calories',
  'relevance',
] as const satisfies readonly RecipeListSort[];

export type RecipeListFilterParams = {
  limit: number;
  offset: number;
  search: string | null;
  searchQuery: ParsedSearchQuery;
  status: RecipeStatus | null | 'invalid';
  ingredient: string | null;
  minCalories: number | null;
  maxCalories: number | null;
  minProteinG: number | null;
  maxProteinG: number | null;
  minSatiety: number | null;
  maxSatiety: number | null;
  sort: RecipeListSort | 'invalid';
  sortDir: RecipeListSortDir | 'invalid';
};

export const parseOptionalSearch = (value?: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * The `search` value, with every run of whitespace collapsed to a single space
 * (JS `\s` also covers non-breaking and other unicode spaces): a search typed
 * or pasted with irregular spacing must denote the same terms as its
 * normally-spaced form for the GitHub-style search parser (#611). Only the
 * search value is normalized this way — the `ingredient` filter phrase-matches
 * stored ingredient names verbatim, so it keeps the trim-only parsing above.
 */
export const parseSearchQuery = (value?: unknown): string | null => {
  const parsed = parseOptionalSearch(value);
  return parsed === null ? null : parsed.replace(/\s+/g, ' ');
};

export const parseLimit = (value?: unknown): number => {
  const parsed = Number(value ?? DEFAULT_RECIPE_LIST_LIMIT);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_RECIPE_LIST_LIMIT;
  }
  return Math.min(parsed, MAX_RECIPE_LIST_LIMIT);
};

export const parseOffset = (value?: unknown): number => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
};

export const parseStatusFilter = (
  value?: unknown,
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

export const parseOptionalNumber = (value?: unknown): number | null => {
  if (value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
};

export const parseSort = (
  value?: unknown,
  defaultSort: RecipeListSort = 'newest',
): RecipeListSort | 'invalid' => {
  if (value === undefined || value === '') {
    return defaultSort;
  }
  if (
    typeof value === 'string' &&
    (SORT_VALUES as readonly string[]).includes(value)
  ) {
    return value as RecipeListSort;
  }
  return 'invalid';
};

export const parseSortDir = (
  value?: unknown,
  defaultDir: RecipeListSortDir = 'desc',
): RecipeListSortDir | 'invalid' => {
  if (value === undefined || value === '') {
    return defaultDir;
  }
  if (value === 'asc' || value === 'desc') {
    return value;
  }
  return 'invalid';
};

type QueryBag = {query: Record<string, unknown>};

export const parseRecipeListFilterParams = (
  req: QueryBag,
  options?: {defaultSort?: RecipeListSort; defaultSortDir?: RecipeListSortDir},
): RecipeListFilterParams => {
  const search = parseSearchQuery(req.query['search']);
  return {
    limit: parseLimit(req.query['limit']),
    offset: parseOffset(req.query['offset']),
    search,
    searchQuery: parseSearchSyntax(search),
    status: parseStatusFilter(req.query['status']),
    ingredient: parseOptionalSearch(req.query['ingredient']),
    minCalories: parseOptionalNumber(req.query['minCalories']),
    maxCalories: parseOptionalNumber(req.query['maxCalories']),
    minProteinG: parseOptionalNumber(req.query['minProteinG']),
    maxProteinG: parseOptionalNumber(req.query['maxProteinG']),
    minSatiety: parseOptionalNumber(req.query['minSatiety']),
    maxSatiety: parseOptionalNumber(req.query['maxSatiety']),
    // Relevance defaulting (#612): while a search is present and the request
    // carries no explicit sort (and the caller named no default), results
    // order best-match-first. An explicit sort always wins, exactly as
    // before; with no search the default stays 'newest'.
    sort: parseSort(
      req.query['sort'],
      options?.defaultSort ?? (search !== null ? 'relevance' : 'newest'),
    ),
    sortDir: parseSortDir(
      req.query['sortDir'],
      options?.defaultSortDir ?? 'desc',
    ),
  };
};

export const nutritionFilterSql = (paramOffset: number) => `
    and ($${paramOffset}::float8 is null or rv.calories >= $${paramOffset})
    and ($${paramOffset + 1}::float8 is null or rv.calories <= $${paramOffset + 1})
    and ($${paramOffset + 2}::float8 is null or rv.protein_g >= $${paramOffset + 2})
    and ($${paramOffset + 3}::float8 is null or rv.protein_g <= $${paramOffset + 3})
    and ($${paramOffset + 4}::float8 is null or rv.satiety_score >= $${paramOffset + 4})
    and ($${paramOffset + 5}::float8 is null or rv.satiety_score <= $${paramOffset + 5})
`;

export const ingredientFilterSql = (paramIndex: number) => `
    and (
      $${paramIndex}::text is null
      or exists (
        select 1 from ingredients i
        where i.recipe_version_id = rv.id
          and i.name ilike '%' || $${paramIndex} || '%'
      )
    )
`;

export const communityRatingSelectSql = `
         (
           select avg(rr.stars)::double precision
           from recipe_ratings rr
           where rr.recipe_id = r.id
         ) as community_rating_average,
         (
           select count(*)::int
           from recipe_ratings rr
           where rr.recipe_id = r.id
         ) as community_rating_count
`;

export const nutritionSelectSql = `
         rv.calories, rv.protein_g, rv.carbs_g, rv.fat_g, rv.fiber_g,
         rv.sugar_g, rv.sodium_mg, rv.prepared_weight_g, rv.satiety_score,
         rv.nutrition_status, rv.nutrition_disclaimer, rv.nutrition_updated_at
`;

export const orderBySql = (
  sort: RecipeListSort,
  sortDir: RecipeListSortDir,
  options?: {fallback?: string; relevanceScore?: string},
): string => {
  const dir = sortDir === 'asc' ? 'asc' : 'desc';
  const nulls = sortDir === 'asc' ? 'nulls first' : 'nulls last';
  // Every branch ends with the unique `rv.id` tie-breaker (the list
  // queries group by r.id, rv.id, so it is unique per row): without a
  // total order, rows that tie on the sort keys — e.g. recipes sharing
  // an updated_at — can be returned in a different relative order by
  // separate offset requests, so paginated consumers (the infinite
  // recipe list, and the meal picker's sequential page fetch, #359)
  // could see duplicates or never see a tied recipe at all.
  switch (sort) {
    case 'relevance': {
      // Best match first (#612); ties fall back to newest, then the unique
      // rv.id tie-breaker. sortDir does not apply: relevance is inherently
      // descending.
      return `${options?.relevanceScore ?? '(0)'} desc, rv.updated_at desc, rv.id desc`;
    }
    case 'rating': {
      return `community_rating_average ${dir} ${nulls}, rv.updated_at desc, rv.id desc`;
    }
    case 'satiety': {
      return `rv.satiety_score ${dir} ${nulls}, rv.updated_at desc, rv.id desc`;
    }
    case 'calories': {
      return `rv.calories ${dir} ${nulls}, rv.updated_at desc, rv.id desc`;
    }
    default: {
      return options?.fallback ?? `rv.updated_at ${dir}, rv.id ${dir}`;
    }
  }
};

export const filterBindValues = (params: RecipeListFilterParams) => [
  params.ingredient,
  params.minCalories,
  params.maxCalories,
  params.minProteinG,
  params.maxProteinG,
  params.minSatiety,
  params.maxSatiety,
];

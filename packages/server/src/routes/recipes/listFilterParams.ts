import type {
  RecipeListSort,
  RecipeListSortDir,
  RecipeStatus,
} from '@eciperay/types';

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
] as const satisfies readonly RecipeListSort[];

export type RecipeListFilterParams = {
  limit: number;
  offset: number;
  search: string | null;
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
 * The title `search` value, with every run of whitespace collapsed to a single
 * space (JS `\s` also covers non-breaking and other unicode spaces): a search
 * typed or pasted with irregular spacing must denote the same words as its
 * normally-spaced form for the word-by-word title match (#385). Only the title
 * search is normalized this way — the `ingredient` filter phrase-matches stored
 * ingredient names verbatim, so it keeps the trim-only parsing above.
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
): RecipeListFilterParams => ({
  limit: parseLimit(req.query['limit']),
  offset: parseOffset(req.query['offset']),
  search: parseSearchQuery(req.query['search']),
  status: parseStatusFilter(req.query['status']),
  ingredient: parseOptionalSearch(req.query['ingredient']),
  minCalories: parseOptionalNumber(req.query['minCalories']),
  maxCalories: parseOptionalNumber(req.query['maxCalories']),
  minProteinG: parseOptionalNumber(req.query['minProteinG']),
  maxProteinG: parseOptionalNumber(req.query['maxProteinG']),
  minSatiety: parseOptionalNumber(req.query['minSatiety']),
  maxSatiety: parseOptionalNumber(req.query['maxSatiety']),
  sort: parseSort(req.query['sort'], options?.defaultSort ?? 'newest'),
  sortDir: parseSortDir(
    req.query['sortDir'],
    options?.defaultSortDir ?? 'desc',
  ),
});

export const nutritionFilterSql = (paramOffset: number) => `
    and ($${paramOffset}::float8 is null or rv.calories >= $${paramOffset})
    and ($${paramOffset + 1}::float8 is null or rv.calories <= $${paramOffset + 1})
    and ($${paramOffset + 2}::float8 is null or rv.protein_g >= $${paramOffset + 2})
    and ($${paramOffset + 3}::float8 is null or rv.protein_g <= $${paramOffset + 3})
    and ($${paramOffset + 4}::float8 is null or rv.satiety_score >= $${paramOffset + 4})
    and ($${paramOffset + 5}::float8 is null or rv.satiety_score <= $${paramOffset + 5})
`;

/**
 * Title search (#385): the search text is matched word by word — every
 * whitespace-separated word must appear somewhere in the title as a
 * case-insensitive substring. A single word therefore behaves exactly like the
 * old contiguous `%word%` match (a word in the middle of the title matches, not
 * only a title prefix), and a multi-word search such as "First Soup" matches
 * "QA — First Soup" even when the words are not contiguous in the title, are
 * separated by different spacing or punctuation, or appear in a different order
 * — the old single-phrase `%First Soup%` match required the words to appear in
 * the title as one contiguous phrase in the same order and spacing, and found
 * nothing otherwise (the #385 picker miss). Implemented as "no search word is
 * absent from the title" so the one search bind value keeps its position in
 * every list query's parameter layout.
 */
/**
 * A search word with the ILIKE pattern metacharacters escaped (backslash first,
 * then `%` and `_`), so a word is matched literally: without this, searching
 * "50%" would also match "50g" and "a_b" would match "axb".
 */
const escapedSearchTokenSql = `replace(replace(replace(search_token.token, '\\', '\\\\'), '%', '\\%'), '_', '\\_')`;

export const titleSearchFilterSql = (paramIndex: number) => `
    and (
      $${paramIndex}::text is null
      or not exists (
        select 1
        from unnest(regexp_split_to_array($${paramIndex}, '\\s+')) as search_token(token)
        where rv.title not ilike '%' || ${escapedSearchTokenSql} || '%'
      )
    )
`;

/**
 * Public-discovery variant of {@link titleSearchFilterSql}: each search word
 * must appear in the title or the description (per word, either field),
 * preserving the old phrase match's title-or-description scope under the same
 * word-by-word semantics (#385).
 */
export const titleOrDescriptionSearchFilterSql = (paramIndex: number) => `
    and (
      $${paramIndex}::text is null
      or not exists (
        select 1
        from unnest(regexp_split_to_array($${paramIndex}, '\\s+')) as search_token(token)
        where rv.title not ilike '%' || ${escapedSearchTokenSql} || '%'
          and coalesce(rv.description, '') not ilike '%' || ${escapedSearchTokenSql} || '%'
      )
    )
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
  options?: {fallback?: string},
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

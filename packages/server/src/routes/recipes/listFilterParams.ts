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
  search: parseOptionalSearch(req.query['search']),
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
  switch (sort) {
    case 'rating': {
      return `community_rating_average ${dir} ${nulls}, rv.updated_at desc`;
    }
    case 'satiety': {
      return `rv.satiety_score ${dir} ${nulls}, rv.updated_at desc`;
    }
    case 'calories': {
      return `rv.calories ${dir} ${nulls}, rv.updated_at desc`;
    }
    default: {
      return options?.fallback ?? `rv.updated_at ${dir}`;
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

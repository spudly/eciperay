import type {
  DuplicateRecipeMatch,
  IngredientInput,
  RecipeInput,
} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';

type QueryFn = typeof defaultQuery;

/**
 * Duplicate detection for imports (issue #296, Stephen's 2026-10-28
 * decision): an import duplicates an existing recipe in the importing
 * user's own library when the normalized title matches AND the normalized
 * ingredient list matches. Normalization is case-insensitive with
 * whitespace trimmed/collapsed. Title alone is NOT a duplicate — two
 * genuinely different recipes can share a name.
 */
export const normalizeForDuplicateMatch = (value: string): string =>
  value.trim().replaceAll(/\s+/g, ' ').toLowerCase();

const normalizeQuantity = (quantity: number | null): string =>
  quantity === null ? '' : String(quantity);

/**
 * One ingredient's normalized identity: name, quantity, unit, and notes.
 * Optional ingredients are a different list entry from required ones.
 */
export const normalizeIngredientForDuplicateMatch = (
  ingredient: Pick<
    IngredientInput,
    'name' | 'quantity' | 'unit' | 'notes' | 'isOptional'
  >,
): string =>
  [
    normalizeForDuplicateMatch(ingredient.name),
    normalizeQuantity(ingredient.quantity ?? null),
    normalizeForDuplicateMatch(ingredient.unit ?? ''),
    normalizeForDuplicateMatch(ingredient.notes ?? ''),
    ingredient.isOptional ? 'optional' : 'required',
  ].join('|');

/**
 * Normalized ingredient-list fingerprint. Order-insensitive (a sorted
 * multiset): re-parsing the same source can order ingredients differently
 * without making the recipe a different one.
 */
export const ingredientListFingerprint = (
  ingredients: readonly Pick<
    IngredientInput,
    'name' | 'quantity' | 'unit' | 'notes' | 'isOptional'
  >[],
): string =>
  ingredients
    .map(ingredient => normalizeIngredientForDuplicateMatch(ingredient))
    .sort()
    .join('\n');

type CandidateRow = {
  id: string;
  title: string;
  ingredients: unknown;
};

const CANDIDATE_RECIPES_SQL = `
  select r.id, rv.title,
    coalesce((
      select json_agg(
        jsonb_build_object(
          'name', i.name, 'quantity', i.quantity, 'unit', i.unit,
          'notes', i.notes, 'isOptional', i.is_optional
        ) order by i.sort_order
      )
      from ingredients i
      where i.recipe_version_id = rv.id
    ), '[]') as ingredients
  from recipes r
  join recipe_versions rv on rv.id = r.active_version_id
  where r.user_id = $1
    and lower(btrim(regexp_replace(rv.title, '\\s+', ' ', 'g'))) = $2
  order by rv.created_at asc
`;

const isCandidateIngredient = (
  value: unknown,
): value is Pick<
  IngredientInput,
  'name' | 'quantity' | 'unit' | 'notes' | 'isOptional'
> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as {name?: unknown}).name === 'string';

/**
 * Returns the oldest existing recipe in the user's library that the given
 * input duplicates, or null when there is no duplicate. Candidates are the
 * user's own recipes (active versions); the SQL title pre-filter (same
 * normalization, applied in the query) keeps the ingredient aggregation
 * and comparison to plausible matches, and the exact comparison below
 * remains the authority for rows the pre-filter returns.
 */
export const findDuplicateRecipe = async (
  userId: string,
  input: Pick<RecipeInput, 'title' | 'ingredients'>,
  queryFn: QueryFn,
): Promise<DuplicateRecipeMatch | null> => {
  const targetTitle = normalizeForDuplicateMatch(input.title);
  const result = await queryFn(CANDIDATE_RECIPES_SQL, [userId, targetTitle]);
  const targetIngredients = ingredientListFingerprint(input.ingredients);
  for (const row of result.rows as CandidateRow[]) {
    if (typeof row.title !== 'string') {
      continue;
    }
    if (normalizeForDuplicateMatch(row.title) !== targetTitle) {
      continue;
    }
    const candidateIngredients = Array.isArray(row.ingredients)
      ? row.ingredients.filter(isCandidateIngredient)
      : [];
    if (ingredientListFingerprint(candidateIngredients) !== targetIngredients) {
      continue;
    }
    return {recipeId: row.id, title: row.title};
  }
  return null;
};

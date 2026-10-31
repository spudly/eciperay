import type {
  DuplicateRecipeMatch,
  IngredientInput,
  RecipeInput,
} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';
import {parseIngredientText} from './parseIngredientText.js';

type QueryFn = typeof defaultQuery;

/**
 * Duplicate detection for imports (issue #296, Stephen's 2026-10-28 decision):
 * an import duplicates an existing recipe in the importing user's own library
 * when the normalized title matches AND the normalized ingredient list matches.
 * Normalization is case-insensitive with whitespace trimmed/collapsed. Title
 * alone is NOT a duplicate — two genuinely different recipes can share a name.
 * Ingredients stored in the pre-split legacy shape are normalized through the
 * importer's parser before fingerprinting (issue #309, see
 * splitLegacyIngredient below); no stored data is migrated.
 */
export const normalizeForDuplicateMatch = (value: string): string =>
  value.trim().replaceAll(/\s+/g, ' ').toLowerCase();

const normalizeQuantity = (quantity: number | null): string =>
  quantity === null ? '' : String(quantity);

type IngredientForDuplicateMatch = Pick<
  IngredientInput,
  'name' | 'quantity' | 'unit' | 'notes' | 'isOptional'
>;

/**
 * Legacy ingredient shape (issue #309): recipes imported before the amount/unit
 * split (PR #308) stored the whole schema.org line as the name with null
 * quantity and unit (e.g. name "200g pasta"). Running such a row through the
 * same parser the importer now uses recovers the split shape (name "pasta",
 * quantity 200, unit "g"), so a re-import of the same page fingerprints
 * identically. Rows that already carry a quantity or a unit are normalized rows
 * and are returned untouched, and a name with no parseable amount prefix parses
 * to a null quantity and is likewise returned untouched — both keep their exact
 * pre-#309 fingerprint.
 */
const splitLegacyIngredient = (
  ingredient: IngredientForDuplicateMatch,
): IngredientForDuplicateMatch => {
  if (ingredient.quantity !== null && ingredient.quantity !== undefined) {
    return ingredient;
  }
  if (ingredient.unit !== null && ingredient.unit !== undefined) {
    return ingredient;
  }
  const parsed = parseIngredientText(ingredient.name);
  if (parsed.quantity === null) {
    return ingredient;
  }
  return {
    ...ingredient,
    name: parsed.name,
    quantity: parsed.quantity,
    unit: parsed.unit,
    // A legacy row's own notes win; the parser's notes (the range text for
    // a ranged amount) fill in only when the row carries none, which is
    // exactly the shape the post-#308 importer stores for the same line.
    notes: ingredient.notes ?? parsed.notes,
  };
};

/**
 * One ingredient's normalized identity: name, quantity, unit, and notes.
 * Optional ingredients are a different list entry from required ones.
 */
export const normalizeIngredientForDuplicateMatch = (
  ingredient: IngredientForDuplicateMatch,
): string => {
  const split = splitLegacyIngredient(ingredient);
  return [
    normalizeForDuplicateMatch(split.name),
    normalizeQuantity(split.quantity ?? null),
    normalizeForDuplicateMatch(split.unit ?? ''),
    normalizeForDuplicateMatch(split.notes ?? ''),
    split.isOptional ? 'optional' : 'required',
  ].join('|');
};

/**
 * Normalized ingredient-list fingerprint. Order-insensitive (a sorted
 * multiset): re-parsing the same source can order ingredients differently
 * without making the recipe a different one.
 */
export const ingredientListFingerprint = (
  ingredients: readonly IngredientForDuplicateMatch[],
): string =>
  ingredients
    .map(ingredient => normalizeIngredientForDuplicateMatch(ingredient))
    .sort()
    .join('\n');

type CandidateRow = {id: string; title: string; ingredients: unknown};

// The SQL title normalization must match normalizeForDuplicateMatch
// (JavaScript) for every title the JS side can match. JS `\s` and trim
// cover the full Unicode whitespace set — including U+00A0 (NBSP) —
// regardless of environment, but PostgreSQL's `\s` classification
// depends on the database collation (in a C locale NBSP is not `\s`),
// and btrim strips only the ASCII space. So the non-ASCII members of
// the JS `\s` set (U+00A0, U+1680, U+2000–U+200A, U+2028, U+2029,
// U+202F, U+205F, U+3000, U+FEFF) are first translated to ASCII spaces;
// after that, `\s+` collapsing and btrim behave identically on both
// sides under any collation. Case folding is the remaining gap:
// PostgreSQL lower() and JS toLowerCase() can disagree on non-ASCII
// characters (locale/Unicode differences), so the pre-filter keeps the
// normalized equality for ASCII titles and additionally admits any raw
// title containing a non-ASCII character — the exact JS comparison
// below remains the authority for those rows.
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
    and (
      lower(btrim(regexp_replace(
        translate(rv.title, E'\\u00a0\\u1680\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff', repeat(' ', 19)),
        '\\s+', ' ', 'g'))) = $2
      or rv.title ~ '[^\\x00-\\x7F]'
    )
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
 * Returns the oldest existing recipe in the user's library that the given input
 * duplicates, or null when there is no duplicate. Candidates are the user's own
 * recipes (active versions); the SQL title pre-filter (same normalization,
 * applied in the query) keeps the ingredient aggregation and comparison to
 * plausible matches, and the exact comparison below remains the authority for
 * rows the pre-filter returns.
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

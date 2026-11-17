import {query as defaultQuery} from '../db/query.js';

type QueryFn = typeof defaultQuery;

/**
 * The issued share-token set (#534, migration 027): every share-link mint
 * records its hash here, and verification accepts any issued hash, so links
 * already sent keep working until rotation or a visibility reset clears the
 * set.
 *
 * Migration-lag tolerance: migrations run as a separate deploy step, so a
 * database that has not applied 027 yet has no recipe_share_tokens table. Every
 * helper here treats a missing table (pg 42P01) as "no issued set": reads fall
 * back to the legacy recipes.share_token_hash column alone and writes become
 * no-ops (the column write in the same request still lands, preserving the
 * pre-027 single-token behavior). Nothing about the hot recipe-detail queries
 * depends on the table existing.
 */
const isMissingTableError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as {code?: unknown}).code === '42P01';

export const loadIssuedShareTokenHashes = async (
  recipeId: string,
  queryFn: QueryFn,
): Promise<string[]> => {
  try {
    const result = await queryFn<{token_hash: string}>(
      `select token_hash from recipe_share_tokens where recipe_id = $1`,
      [recipeId],
    );
    return result.rows.map(row => row.token_hash);
  } catch (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    throw error;
  }
};

export const recordIssuedShareToken = async (
  recipeId: string,
  tokenHash: string,
  queryFn: QueryFn,
): Promise<void> => {
  try {
    await queryFn(
      `insert into recipe_share_tokens (recipe_id, token_hash)
       values ($1, $2)
       on conflict do nothing`,
      [recipeId, tokenHash],
    );
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }
  }
};

export const clearIssuedShareTokens = async (
  recipeId: string,
  queryFn: QueryFn,
): Promise<void> => {
  try {
    await queryFn(`delete from recipe_share_tokens where recipe_id = $1`, [
      recipeId,
    ]);
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }
  }
};

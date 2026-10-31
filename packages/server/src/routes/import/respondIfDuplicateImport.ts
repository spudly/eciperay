import type {Response} from 'express';
import type {DuplicateRecipeMatch, RecipeInput} from '@eciperay/types';

import {query as defaultQuery} from '../../db/query.js';
import {findDuplicateRecipe} from '../../lib/findDuplicateRecipe.js';

type QueryFn = typeof defaultQuery;

/** Machine-readable `error` code the import endpoints return on a duplicate. */
export const DUPLICATE_RECIPE_ERROR_CODE = 'duplicate_recipe';

/** Builds the human-readable duplicate warning naming the existing recipe. */
export const duplicateRecipeMessage = (match: DuplicateRecipeMatch): string =>
  `This recipe already exists in your library as "${match.title}". Import anyway to create a second copy.`;

/** The 409 body the import endpoints return when an import is a duplicate. */
export const duplicateRecipeBody = (duplicate: DuplicateRecipeMatch) => ({
  error: DUPLICATE_RECIPE_ERROR_CODE,
  message: duplicateRecipeMessage(duplicate),
  duplicate,
});

/**
 * Shared duplicate guard for the import endpoints (issue #296). When the
 * prepared input duplicates an existing recipe in the user's library and
 * the request did not explicitly override (`allowDuplicate`), this responds
 * 409 with the duplicate warning and returns true — the handler must stop
 * without saving. With the override, or when there is no duplicate, it
 * returns false and the handler saves as usual.
 */
export const respondIfDuplicateImport = async (
  res: Response,
  params: {
    userId: string;
    input: Pick<RecipeInput, 'title' | 'ingredients'>;
    allowDuplicate?: boolean;
    queryFn: QueryFn;
  },
): Promise<boolean> => {
  if (params.allowDuplicate) {
    return false;
  }
  const duplicate = await findDuplicateRecipe(
    params.userId,
    params.input,
    params.queryFn,
  );
  if (!duplicate) {
    return false;
  }
  res.status(409).json(duplicateRecipeBody(duplicate));
  return true;
};

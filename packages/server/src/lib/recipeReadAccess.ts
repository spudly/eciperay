import type {OptionalAuthedRequest} from '../middleware/optionalAuth.js';
import {query as defaultQuery} from '../db/query.js';
import {GET_PUBLIC_RECIPE_DETAIL_SQL} from '../routes/recipes/sqlConstants.js';

import {getShareTokenFromQuery} from './getShareTokenFromQuery.js';
import {mapRowToRecipeDetail} from './mapRowToRecipeDetail.js';
import {
  canReadRecipe,
  resolvePublicRecipeAccess,
  toRecipeAccessRecord,
  type RecipeAccessRecord,
} from './recipeAccess.js';
import {userHasShareGrant} from './shareGrant.js';

type QueryFn = typeof defaultQuery;

export type ReadableRecipeRow = Parameters<typeof mapRowToRecipeDetail>[0];

export const loadReadableRecipeRow = async (
  recipeId: string,
  userId: string,
  queryFn: QueryFn,
): Promise<ReadableRecipeRow | null> => {
  const result = await queryFn(GET_PUBLIC_RECIPE_DETAIL_SQL, [recipeId]);
  const row = result.rows[0] as ReadableRecipeRow | undefined;
  if (!row) {
    return null;
  }

  const hasShareGrant = await userHasShareGrant(recipeId, userId, queryFn);
  if (!canReadRecipe(toRecipeAccessRecord(row), {userId, hasShareGrant})) {
    return null;
  }

  return row;
};

export type PublicRecipeAccessResult =
  | {status: 'ok'; row: ReadableRecipeRow; access: RecipeAccessRecord}
  | {status: 'not_found'}
  | {status: 'forbidden'};

export const loadPublicReadableRecipeRow = async (
  req: OptionalAuthedRequest,
  recipeId: string,
  queryFn: QueryFn,
): Promise<PublicRecipeAccessResult> => {
  const result = await queryFn(GET_PUBLIC_RECIPE_DETAIL_SQL, [recipeId]);
  const row = result.rows[0] as ReadableRecipeRow | undefined;
  if (!row) {
    return {status: 'not_found'};
  }

  const accessRecord = toRecipeAccessRecord(row);
  const hasShareGrant = req.userId
    ? await userHasShareGrant(recipeId, req.userId, queryFn)
    : false;

  const denial = resolvePublicRecipeAccess(accessRecord, {
    shareToken: getShareTokenFromQuery(req),
    userId: req.userId,
    hasShareGrant,
  });

  if (denial === 'not_found') {
    return {status: 'not_found'};
  }

  if (denial === 'forbidden') {
    return {status: 'forbidden'};
  }

  return {status: 'ok', row, access: accessRecord};
};

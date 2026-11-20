import type {RecipeShareGrantVia} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';

type QueryFn = typeof defaultQuery;

export const HAS_SHARE_GRANT_SQL = `
  select 1
  from recipe_share_grants
  where recipe_id = $1 and user_id = $2
  limit 1
`;

export const INSERT_SHARE_GRANT_SQL = `
  insert into recipe_share_grants (recipe_id, user_id, via)
  values ($1, $2, $3)
  on conflict (recipe_id, user_id) do update
    set granted_at = excluded.granted_at,
        via = excluded.via
`;

export const deleteRecipeShareGrants = async (
  recipeId: string,
  queryFn: QueryFn,
) => {
  await queryFn(`delete from recipe_share_grants where recipe_id = $1`, [
    recipeId,
  ]);
};

export const userHasShareGrant = async (
  recipeId: string,
  userId: string,
  queryFn: QueryFn,
): Promise<boolean> => {
  const result = await queryFn(HAS_SHARE_GRANT_SQL, [recipeId, userId]);
  return (result.rowCount ?? 0) > 0;
};

export const recordShareGrant = async (
  recipeId: string,
  userId: string,
  via: RecipeShareGrantVia,
  queryFn: QueryFn,
) => {
  await queryFn(INSERT_SHARE_GRANT_SQL, [recipeId, userId, via]);
};

export const shouldAutoRecordShareGrant = (
  userId: string | undefined,
  ownerUserId: string,
): userId is string => {
  return Boolean(userId && userId !== ownerUserId);
};

export const HAS_FAMILY_SHARE_GRANT_SQL = `
  select 1
  from family_share_grants
  where owner_user_id = $1 and recipient_user_id = $2
  limit 1
`;

export const HAS_FAMILY_SHARE_GRANT_FOR_RECIPE_SQL = `
  select 1
  from family_share_grants fg
  join recipes r on r.user_id = fg.owner_user_id
  where r.id = $1 and fg.recipient_user_id = $2
  limit 1
`;

/**
 * Either sharing path: a per-recipe grant on this recipe, or a standing
 * family grant from the recipe's owner to this user (#617). This is the
 * check the central read-access layer uses, so family recipients get the
 * same view/clone access as individual grantees.
 */
export const HAS_SHARE_ACCESS_SQL = `
  select 1
  where exists (
    select 1 from recipe_share_grants
    where recipe_id = $1 and user_id = $2
  ) or exists (
    select 1
    from family_share_grants fg
    join recipes r on r.user_id = fg.owner_user_id
    where r.id = $1 and fg.recipient_user_id = $2
  )
  limit 1
`;

export const userHasFamilyShareGrant = async (
  ownerUserId: string,
  recipientUserId: string,
  queryFn: QueryFn,
): Promise<boolean> => {
  const result = await queryFn(HAS_FAMILY_SHARE_GRANT_SQL, [
    ownerUserId,
    recipientUserId,
  ]);
  return (result.rowCount ?? 0) > 0;
};

export const userHasFamilyShareGrantForRecipe = async (
  recipeId: string,
  userId: string,
  queryFn: QueryFn,
): Promise<boolean> => {
  const result = await queryFn(HAS_FAMILY_SHARE_GRANT_FOR_RECIPE_SQL, [
    recipeId,
    userId,
  ]);
  return (result.rowCount ?? 0) > 0;
};

export const userHasShareAccess = async (
  recipeId: string,
  userId: string,
  queryFn: QueryFn,
): Promise<boolean> => {
  const result = await queryFn(HAS_SHARE_ACCESS_SQL, [recipeId, userId]);
  return (result.rowCount ?? 0) > 0;
};

export const SHARE_ACCESS_BASIS_SQL = `
  select
    exists (
      select 1 from recipe_share_grants
      where recipe_id = $1 and user_id = $2
    ) as has_individual_grant,
    exists (
      select 1
      from family_share_grants fg
      join recipes r on r.user_id = fg.owner_user_id
      where r.id = $1 and fg.recipient_user_id = $2
    ) as has_family_grant
`;

export type ShareAccessBasis = {
  hasIndividualGrant: boolean;
  hasFamilyGrant: boolean;
};

/**
 * Both sharing bases from ONE query — a single statement sees a single
 * snapshot, so a revocation cannot land between the access decision and
 * the basis a caller acts on (e.g. loadPublicRecipe's grant recording).
 */
export const getShareAccessBasis = async (
  recipeId: string,
  userId: string,
  queryFn: QueryFn,
): Promise<ShareAccessBasis> => {
  const result = await queryFn(SHARE_ACCESS_BASIS_SQL, [recipeId, userId]);
  const row = result.rows[0] as
    | {has_individual_grant: boolean; has_family_grant: boolean}
    | undefined;
  return {
    hasIndividualGrant: Boolean(row?.has_individual_grant),
    hasFamilyGrant: Boolean(row?.has_family_grant),
  };
};

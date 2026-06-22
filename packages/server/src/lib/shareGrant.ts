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

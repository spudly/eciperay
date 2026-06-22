import type {RecipeStarRating} from '@eciperay/types';

import {query as defaultQuery} from '../../db/query.js';

type QueryFn = typeof defaultQuery;

export const LIST_COMMUNITY_RATING_ROWS_SQL = `
  select rr.stars, rr.content_revision
  from recipe_ratings rr
  join recipes r on r.id = rr.recipe_id
  where rr.recipe_id = $1
    and rr.user_id <> r.user_id
`;

export const GET_VIEWER_COMMUNITY_RATING_SQL = `
  select stars
  from recipe_ratings
  where recipe_id = $1 and user_id = $2
`;

export const UPSERT_COMMUNITY_RATING_SQL = `
  insert into recipe_ratings (recipe_id, user_id, stars, content_revision)
  values ($1, $2, $3, $4)
  on conflict (recipe_id, user_id)
  do update set stars = excluded.stars, content_revision = excluded.content_revision
`;

export const DELETE_COMMUNITY_RATING_SQL = `
  delete from recipe_ratings
  where recipe_id = $1 and user_id = $2
`;

export const UPDATE_OWNER_STAR_RATING_SQL = `
  update recipes
  set star_rating = $3
  where id = $1 and user_id = $2
  returning id
`;

export const listCommunityRatingRows = (recipeId: string, queryFn: QueryFn) =>
  queryFn<{stars: number; content_revision: number}>(
    LIST_COMMUNITY_RATING_ROWS_SQL,
    [recipeId],
  );

export const getViewerCommunityRating = async (
  recipeId: string,
  userId: string,
  queryFn: QueryFn,
): Promise<RecipeStarRating | null> => {
  const result = await queryFn<{stars: RecipeStarRating}>(
    GET_VIEWER_COMMUNITY_RATING_SQL,
    [recipeId, userId],
  );
  return result.rows[0]?.stars ?? null;
};

export const upsertCommunityRating = (
  opts: {
    recipeId: string;
    userId: string;
    stars: RecipeStarRating;
    contentRevision: number;
  },
  queryFn: QueryFn,
) =>
  queryFn(UPSERT_COMMUNITY_RATING_SQL, [
    opts.recipeId,
    opts.userId,
    opts.stars,
    opts.contentRevision,
  ]);

export const deleteCommunityRating = (
  recipeId: string,
  userId: string,
  queryFn: QueryFn,
) => queryFn(DELETE_COMMUNITY_RATING_SQL, [recipeId, userId]);

export const updateOwnerStarRating = (
  recipeId: string,
  ownerUserId: string,
  stars: RecipeStarRating | null,
  queryFn: QueryFn,
) => queryFn(UPDATE_OWNER_STAR_RATING_SQL, [recipeId, ownerUserId, stars]);

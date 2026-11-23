import type {
  HiddenRecipeItem,
  RecipeInterestSignal,
  RecipeInterestSignalKind,
  RecipeShowLess,
  SavedRecipe,
  SavedRecipeItem,
  ShowLessItem,
  UserFollow,
} from '@eciperay/types';

import {query as defaultQuery} from '../../db/query.js';
import {
  communityRatingSelectSql,
  nutritionSelectSql,
} from '../recipes/listFilterParams.js';

type QueryFn = typeof defaultQuery;

// ─── Saves ────────────────────────────────────────────────────────────────────

export const SAVE_RECIPE_SQL = `
  insert into saved_recipes (user_id, recipe_id)
  values ($1, $2)
  on conflict (user_id, recipe_id) do update
    set created_at = saved_recipes.created_at
  returning user_id, recipe_id, created_at
`;

export const UNSAVE_RECIPE_SQL = `
  delete from saved_recipes
  where user_id = $1 and recipe_id = $2
`;

export const LIST_SAVED_RECIPES_SQL = `
  select sr.user_id, sr.recipe_id, sr.created_at, rv.title
  from saved_recipes sr
  join recipes r on r.id = sr.recipe_id
  join recipe_versions rv on rv.id = r.active_version_id
  where sr.user_id = $1
  order by sr.created_at desc
  limit $2 offset $3
`;

type SavedRow = {user_id: string; recipe_id: string; created_at: string};

type SavedItemRow = SavedRow & {title: string};

export const saveRecipe = async (
  userId: string,
  recipeId: string,
  queryFn: QueryFn,
): Promise<SavedRecipe> => {
  const result = await queryFn(SAVE_RECIPE_SQL, [userId, recipeId]);
  const row = result.rows[0] as SavedRow;
  return {
    userId: row.user_id,
    recipeId: row.recipe_id,
    createdAt: row.created_at,
  };
};

/** Returns false when the recipe was not saved. */
export const unsaveRecipe = async (
  userId: string,
  recipeId: string,
  queryFn: QueryFn,
): Promise<boolean> => {
  const result = await queryFn(UNSAVE_RECIPE_SQL, [userId, recipeId]);
  return (result.rowCount ?? 0) > 0;
};

export const listSavedRecipes = async (
  userId: string,
  limit: number,
  offset: number,
  queryFn: QueryFn,
): Promise<SavedRecipeItem[]> => {
  const result = await queryFn(LIST_SAVED_RECIPES_SQL, [userId, limit, offset]);
  return (result.rows as SavedItemRow[]).map(row => ({
    userId: row.user_id,
    recipeId: row.recipe_id,
    createdAt: row.created_at,
    title: row.title,
  }));
};

// ─── Hard hide (recipe_disinterest) ──────────────────────────────────────────

export const HIDE_RECIPE_SQL = `
  insert into recipe_disinterest (user_id, recipe_id)
  values ($1, $2)
  on conflict (user_id, recipe_id) do update
    set created_at = recipe_disinterest.created_at
  returning user_id, recipe_id, created_at
`;

export const UNHIDE_RECIPE_SQL = `
  delete from recipe_disinterest
  where user_id = $1 and recipe_id = $2
`;

export const LIST_HIDDEN_RECIPES_SQL = `
  select rd.user_id, rd.recipe_id, rd.created_at, rv.title
  from recipe_disinterest rd
  join recipes r on r.id = rd.recipe_id
  join recipe_versions rv on rv.id = r.active_version_id
  where rd.user_id = $1
  order by rd.created_at desc
  limit $2 offset $3
`;

export const hideRecipe = async (
  userId: string,
  recipeId: string,
  queryFn: QueryFn,
): Promise<{userId: string; recipeId: string; createdAt: string}> => {
  const result = await queryFn(HIDE_RECIPE_SQL, [userId, recipeId]);
  const row = result.rows[0] as SavedRow;
  return {
    userId: row.user_id,
    recipeId: row.recipe_id,
    createdAt: row.created_at,
  };
};

/** Returns false when the recipe was not hidden. */
export const unhideRecipe = async (
  userId: string,
  recipeId: string,
  queryFn: QueryFn,
): Promise<boolean> => {
  const result = await queryFn(UNHIDE_RECIPE_SQL, [userId, recipeId]);
  return (result.rowCount ?? 0) > 0;
};

export const listHiddenRecipes = async (
  userId: string,
  limit: number,
  offset: number,
  queryFn: QueryFn,
): Promise<HiddenRecipeItem[]> => {
  const result = await queryFn(LIST_HIDDEN_RECIPES_SQL, [
    userId,
    limit,
    offset,
  ]);
  return (result.rows as SavedItemRow[]).map(row => ({
    userId: row.user_id,
    recipeId: row.recipe_id,
    createdAt: row.created_at,
    title: row.title,
  }));
};

// ─── Show less like this (recipe_show_less, soft negative) ───────────────────

export const SHOW_LESS_SQL = `
  insert into recipe_show_less (user_id, source_recipe_id)
  values ($1, $2)
  on conflict (user_id, source_recipe_id) do update
    set created_at = recipe_show_less.created_at
  returning user_id, source_recipe_id, created_at
`;

export const UNDO_SHOW_LESS_SQL = `
  delete from recipe_show_less
  where user_id = $1 and source_recipe_id = $2
`;

export const LIST_SHOW_LESS_SQL = `
  select rsl.user_id, rsl.source_recipe_id, rsl.created_at, rv.title
  from recipe_show_less rsl
  join recipes r on r.id = rsl.source_recipe_id
  join recipe_versions rv on rv.id = r.active_version_id
  where rsl.user_id = $1
  order by rsl.created_at desc
  limit $2 offset $3
`;

type ShowLessRow = {
  user_id: string;
  source_recipe_id: string;
  created_at: string;
};

type ShowLessItemRow = ShowLessRow & {title: string};

export const showLessLikeThis = async (
  userId: string,
  sourceRecipeId: string,
  queryFn: QueryFn,
): Promise<RecipeShowLess> => {
  const result = await queryFn(SHOW_LESS_SQL, [userId, sourceRecipeId]);
  const row = result.rows[0] as ShowLessRow;
  return {
    userId: row.user_id,
    sourceRecipeId: row.source_recipe_id,
    createdAt: row.created_at,
  };
};

/** Returns false when the recipe was not a show-less source. */
export const undoShowLess = async (
  userId: string,
  sourceRecipeId: string,
  queryFn: QueryFn,
): Promise<boolean> => {
  const result = await queryFn(UNDO_SHOW_LESS_SQL, [userId, sourceRecipeId]);
  return (result.rowCount ?? 0) > 0;
};

export const listShowLess = async (
  userId: string,
  limit: number,
  offset: number,
  queryFn: QueryFn,
): Promise<ShowLessItem[]> => {
  const result = await queryFn(LIST_SHOW_LESS_SQL, [userId, limit, offset]);
  return (result.rows as ShowLessItemRow[]).map(row => ({
    userId: row.user_id,
    sourceRecipeId: row.source_recipe_id,
    createdAt: row.created_at,
    title: row.title,
  }));
};

// ─── Follows ──────────────────────────────────────────────────────────────────

export const FIND_USER_BY_ID_SQL = `
  select id, email, display_name
  from users
  where id = $1
  limit 1
`;

export const FOLLOW_USER_SQL = `
  insert into user_follows (follower_id, followee_id)
  values ($1, $2)
  on conflict (follower_id, followee_id) do update
    set created_at = user_follows.created_at
  returning follower_id, followee_id, created_at
`;

export const UNFOLLOW_USER_SQL = `
  delete from user_follows
  where follower_id = $1 and followee_id = $2
`;

export const LIST_FOLLOWS_SQL = `
  select uf.follower_id, uf.followee_id, uf.created_at,
         u.email as followee_email,
         u.display_name as followee_display_name
  from user_follows uf
  join users u on u.id = uf.followee_id
  where uf.follower_id = $1
  order by uf.created_at desc
`;

type FollowRow = {
  follower_id: string;
  followee_id: string;
  followee_email: string;
  followee_display_name: string | null;
  created_at: string;
};

const mapFollowRow = (row: FollowRow): UserFollow => ({
  followerId: row.follower_id,
  followeeId: row.followee_id,
  followeeEmail: row.followee_email,
  followeeDisplayName: row.followee_display_name,
  createdAt: row.created_at,
});

export type FollowUserResult =
  {kind: 'ok'; follow: UserFollow} | {kind: 'unknown_user'} | {kind: 'self'};

/**
 * Follow another user (#622). Following feeds the discovery feed with the
 * followee's public recipes, saves, and high ratings. Only existing accounts
 * can be followed; following yourself is a clear error.
 */
export const followUser = async (
  followerId: string,
  followeeId: string,
  queryFn: QueryFn,
): Promise<FollowUserResult> => {
  if (followeeId === followerId) {
    return {kind: 'self'};
  }
  const userResult = await queryFn(FIND_USER_BY_ID_SQL, [followeeId]);
  const followee = userResult.rows[0] as
    {id: string; email: string; display_name: string | null} | undefined;
  if (!followee) {
    return {kind: 'unknown_user'};
  }
  const inserted = await queryFn(FOLLOW_USER_SQL, [followerId, followeeId]);
  const row = inserted.rows[0] as {
    follower_id: string;
    followee_id: string;
    created_at: string;
  };
  return {
    kind: 'ok',
    follow: mapFollowRow({
      ...row,
      followee_email: followee.email,
      followee_display_name: followee.display_name,
    }),
  };
};

/** Returns false when the user was not followed. */
export const unfollowUser = async (
  followerId: string,
  followeeId: string,
  queryFn: QueryFn,
): Promise<boolean> => {
  const result = await queryFn(UNFOLLOW_USER_SQL, [followerId, followeeId]);
  return (result.rowCount ?? 0) > 0;
};

export const listFollows = async (
  followerId: string,
  queryFn: QueryFn,
): Promise<UserFollow[]> => {
  const result = await queryFn(LIST_FOLLOWS_SQL, [followerId]);
  return (result.rows as FollowRow[]).map(mapFollowRow);
};

// ─── Interest signals (soft) ─────────────────────────────────────────────────

export const RECORD_INTEREST_SIGNAL_SQL = `
  insert into recipe_interest_signals (user_id, recipe_id, signal, dwell_ms)
  values ($1, $2, $3, $4)
  returning id, user_id, recipe_id, signal, dwell_ms, created_at
`;

type SignalRow = {
  id: string;
  user_id: string;
  recipe_id: string;
  signal: RecipeInterestSignalKind;
  dwell_ms: number | null;
  created_at: string;
};

/**
 * Record a soft engagement signal (Stephen's approval amendment, 2026-11-21):
 * dwell / engagement = 'interest' (not a save); a quick swipe-past =
 * 'disinterest' (not a hide). Signals are append-only and feed discovery
 * ranking only.
 */
export const recordInterestSignal = async (
  opts: {
    userId: string;
    recipeId: string;
    signal: RecipeInterestSignalKind;
    dwellMs: number | null;
  },
  queryFn: QueryFn,
): Promise<RecipeInterestSignal> => {
  const result = await queryFn(RECORD_INTEREST_SIGNAL_SQL, [
    opts.userId,
    opts.recipeId,
    opts.signal,
    opts.dwellMs,
  ]);
  const row = result.rows[0] as SignalRow;
  return {
    id: row.id,
    userId: row.user_id,
    recipeId: row.recipe_id,
    signal: row.signal,
    dwellMs: row.dwell_ms,
    createdAt: row.created_at,
  };
};

// ─── Discovery feed ───────────────────────────────────────────────────────────

/**
 * Discovery feed ranking — deliberately simple and documented here (#622
 * tranche 1; richer ranking is follow-up work):
 *
 * Discovery_score = 3 * (author is followed by the requester) + 2 * (a followee
 * saved this recipe) + 1 * (a followee rated this recipe 4+ stars) + net
 * interest signals for this recipe from ALL users ('interest' count -
 * 'disinterest' count, scaled by 0.1) - show-less penalty (below)
 *
 * Hard rules, applied before ranking:
 *
 * - Only public recipes, never the requester's own, never 'idea' status (private
 *   recipes reach other users only via family sharing, #617 — they never enter
 *   discovery).
 * - Recipes in the requester's recipe_disinterest set are EXCLUDED entirely (hard
 *   hide wins over every signal).
 * - The requester's own quick-disinterest signals do NOT exclude a recipe; they
 *   deprioritise it via an extra -5 penalty when the requester's latest signal
 *   for the recipe is 'disinterest'.
 *
 * Show-less penalty (#623, soft negative signal): -2 for each of the
 * requester's recipe_show_less sources that is similar to the candidate,
 * capped at -6 total (least(6, 2 * matching sources)). A source is similar
 * when it shares at least one tag with the candidate or has the same
 * author. (There is no structured category field on a recipe version, so
 * v1 similarity is tags + author only.) The penalty demotes but never
 * excludes. Two carve-outs:
 *
 * - The source recipe itself is NOT penalised (and never excluded by
 *   show-less) — hard hide remains the exclusion tool.
 * - An explicit save or cook of the candidate by the requester cancels
 *   its penalty entirely: a save/cook outweighs a soft down-rank.
 *
 * Ordering: discovery_score desc, then most recently updated.
 */
export const DISCOVERY_FEED_SQL = `
  select r.id, r.slug, r.visibility,
         rv.title, rv.description, rv.servings, rv.prep_time_min,
         rv.cook_time_min, rv.image_url, rv.updated_at,
         case when u.show_author_on_public_recipes
           then u.display_name else null end as author_display_name,
         ${nutritionSelectSql},
         ${communityRatingSelectSql},
         coalesce(
           json_agg(
             json_build_object('id', t.id, 'name', t.name, 'color', t.color)
           ) filter (where t.id is not null),
           '[]'
         ) as tags,
         (case when exists (
            select 1 from user_follows uf
            where uf.follower_id = $1 and uf.followee_id = r.user_id
          ) then 1 else 0 end) as from_followee,
         (case when exists (
            select 1 from saved_recipes sr
            join user_follows uf2
              on uf2.followee_id = sr.user_id and uf2.follower_id = $1
            where sr.recipe_id = r.id
          ) then 1 else 0 end) as saved_by_followee,
         (
           3 * (case when exists (
                  select 1 from user_follows uf
                  where uf.follower_id = $1 and uf.followee_id = r.user_id
                ) then 1 else 0 end)
           + 2 * (case when exists (
                    select 1 from saved_recipes sr
                    join user_follows uf2
                      on uf2.followee_id = sr.user_id
                     and uf2.follower_id = $1
                    where sr.recipe_id = r.id
                  ) then 1 else 0 end)
           + 1 * (case when exists (
                    select 1 from recipe_ratings rr
                    join user_follows uf3
                      on uf3.followee_id = rr.user_id
                     and uf3.follower_id = $1
                    where rr.recipe_id = r.id and rr.stars >= 4
                  ) then 1 else 0 end)
           + 0.1 * (
               select count(*) filter (where ris.signal = 'interest')
                    - count(*) filter (where ris.signal = 'disinterest')
               from recipe_interest_signals ris
               where ris.recipe_id = r.id
             )
           - 5 * (case when (
                    select ris2.signal
                    from recipe_interest_signals ris2
                    where ris2.recipe_id = r.id and ris2.user_id = $1
                    order by ris2.created_at desc
                    limit 1
                  ) = 'disinterest' then 1 else 0 end)
           - (case when exists (
                    select 1 from saved_recipes sr3
                    where sr3.recipe_id = r.id and sr3.user_id = $1
                  ) or exists (
                    select 1 from cook_logs cl
                    join recipe_versions clv
                      on clv.id = cl.recipe_version_id
                    where clv.recipe_id = r.id and cl.user_id = $1
                  )
               then 0
               else least(6, 2 * (
                 select count(*)
                 from recipe_show_less rsl
                 join recipes sr on sr.id = rsl.source_recipe_id
                 join recipe_versions srv on srv.id = sr.active_version_id
                 where rsl.user_id = $1
                   and rsl.source_recipe_id <> r.id
                   and (
                     sr.user_id = r.user_id
                     or exists (
                       select 1
                       from recipe_tags srt
                       join recipe_tags crt
                         on crt.tag_id = srt.tag_id
                       where srt.recipe_version_id = srv.id
                         and crt.recipe_version_id = rv.id
                     )
                   )
               )) end)
         )::double precision as discovery_score
  from recipes r
  join recipe_versions rv on rv.id = r.active_version_id
  join users u on u.id = r.user_id
  left join recipe_tags rt on rt.recipe_version_id = rv.id
  left join tags t on t.id = rt.tag_id
  where r.visibility = 'public'
    and r.status <> 'idea'
    and r.user_id <> $1
    and not exists (
      select 1 from recipe_disinterest rd
      where rd.recipe_id = r.id and rd.user_id = $1
    )
  group by r.id, rv.id, u.display_name, u.show_author_on_public_recipes
  order by discovery_score desc, rv.updated_at desc
  limit $2 offset $3
`;

export const listDiscoveryFeedRows = (
  userId: string,
  limit: number,
  offset: number,
  queryFn: QueryFn,
) => queryFn(DISCOVERY_FEED_SQL, [userId, limit, offset]);

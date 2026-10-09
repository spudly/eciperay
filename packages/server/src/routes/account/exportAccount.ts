import type {Response} from 'express';
import type {AccountExportBundle} from '@eciperay/types';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {buildRecipeExportRecords} from '../../lib/buildRecipeExportRecords.js';
import {fetchNutritionGoals} from '../../lib/nutritionGoalsQueries.js';

type QueryFn = typeof defaultQuery;

const PROFILE_SQL = `
  select email, display_name, created_at
  from users
  where id = $1
`;

const LIST_RECIPE_IDS_SQL = `
  select id from recipes
  where user_id = $1
  order by updated_at desc
`;

const LIST_SHARE_GRANTS_SQL = `
  select recipe_id, granted_at, via
  from recipe_share_grants
  where user_id = $1
  order by granted_at desc
`;

const LIST_RATINGS_SQL = `
  select recipe_id, stars, content_revision, created_at
  from recipe_ratings
  where user_id = $1
  order by created_at desc
`;

const LIST_COMMENTS_SQL = `
  select id, recipe_id, body, content_revision, created_at, updated_at
  from recipe_comments
  where user_id = $1
  order by created_at desc
`;

export const exportAccount = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const profileResult = await queryFn(PROFILE_SQL, [req.userId]);
  const profileRow = profileResult.rows[0] as
    | {email: string; display_name: string | null; created_at: string}
    | undefined;
  if (!profileRow) {
    res.status(404).json({error: 'User not found'});
    return;
  }

  const idsResult = await queryFn(LIST_RECIPE_IDS_SQL, [req.userId]);
  const recipeIds = idsResult.rows.map(row => (row as {id: string}).id);
  const recipes = await buildRecipeExportRecords(
    recipeIds,
    req.userId,
    queryFn,
  );

  const grantsResult = await queryFn(LIST_SHARE_GRANTS_SQL, [req.userId]);
  const ratingsResult = await queryFn(LIST_RATINGS_SQL, [req.userId]);
  const commentsResult = await queryFn(LIST_COMMENTS_SQL, [req.userId]);
  const nutritionGoals = await fetchNutritionGoals(req.userId, queryFn);

  const bundle: AccountExportBundle = {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    profile: {
      email: profileRow.email,
      displayName: profileRow.display_name,
      createdAt: profileRow.created_at,
    },
    nutritionGoals,
    recipes,
    shareGrants: grantsResult.rows.map(row => {
      const grant = row as {
        recipe_id: string;
        granted_at: string;
        via: 'link' | 'explicit';
      };
      return {
        recipeId: grant.recipe_id,
        grantedAt: grant.granted_at,
        via: grant.via,
      };
    }),
    communityRatings: ratingsResult.rows.map(row => {
      const rating = row as {
        recipe_id: string;
        stars: 1 | 2 | 3 | 4 | 5;
        content_revision: number;
        created_at: string;
      };
      return {
        recipeId: rating.recipe_id,
        stars: rating.stars,
        contentRevision: rating.content_revision,
        createdAt: rating.created_at,
      };
    }),
    comments: commentsResult.rows.map(row => {
      const comment = row as {
        id: string;
        recipe_id: string;
        body: string;
        content_revision: number | null;
        created_at: string;
        updated_at: string;
      };
      return {
        id: comment.id,
        recipeId: comment.recipe_id,
        body: comment.body,
        contentRevision: comment.content_revision,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
      };
    }),
  };

  res.json(bundle);
};

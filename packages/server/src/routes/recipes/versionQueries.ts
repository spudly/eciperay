import type {RecipeInput, VersionCreatedVia} from '@eciperay/types';

import {query as defaultQuery} from '../../db/query.js';

type QueryFn = typeof defaultQuery;

export type InsertVersionOptions = {
  recipeId: string;
  versionNumber: number;
  title: string;
  description: string | null;
  servings: number;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  createdVia: VersionCreatedVia;
  changeSummary?: string | null;
  derivedFromVersionId?: string | null;
};

const INSERT_LINEAGE_SQL = `
  insert into recipes (user_id, status, slug)
  values ($1, 'idea', $2)
  returning id
`;

const INSERT_VERSION_SQL = `
  insert into recipe_versions (
    recipe_id, version_number, title, description, servings,
    prep_time_min, cook_time_min, image_url, source_url,
    created_via, change_summary, derived_from_version_id
  ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
  returning id
`;

const SET_ACTIVE_VERSION_SQL = `
  update recipes set active_version_id = $2 where id = $1
`;

export const insertLineage = (userId: string, slug: string, queryFn: QueryFn) =>
  queryFn<{id: string}>(INSERT_LINEAGE_SQL, [userId, slug]);

export const insertVersion = (opts: InsertVersionOptions, queryFn: QueryFn) =>
  queryFn<{id: string}>(INSERT_VERSION_SQL, [
    opts.recipeId,
    opts.versionNumber,
    opts.title,
    opts.description,
    opts.servings,
    opts.prepTimeMin,
    opts.cookTimeMin,
    opts.imageUrl,
    opts.sourceUrl,
    opts.createdVia,
    opts.changeSummary ?? null,
    opts.derivedFromVersionId ?? null,
  ]);

export const setActiveVersion = (
  recipeId: string,
  versionId: string,
  queryFn: QueryFn,
) => queryFn(SET_ACTIVE_VERSION_SQL, [recipeId, versionId]);

export const buildVersionOptions = ({
  input,
  recipeId,
  versionNumber,
  createdVia,
  extras = {},
}: {
  input: RecipeInput;
  recipeId: string;
  versionNumber: number;
  createdVia: VersionCreatedVia;
  extras?: Partial<InsertVersionOptions>;
}): InsertVersionOptions => ({
  recipeId,
  versionNumber,
  title: input.title,
  description: input.description ?? null,
  servings: input.servings,
  prepTimeMin: input.prepTimeMin ?? null,
  cookTimeMin: input.cookTimeMin ?? null,
  imageUrl: input.imageUrl ?? null,
  sourceUrl: input.sourceUrl ?? null,
  createdVia,
  ...extras,
});

export const getNextVersionNumber = async (
  recipeId: string,
  queryFn: QueryFn,
): Promise<number> => {
  const result = await queryFn<{max: number | null}>(
    'select max(version_number) as max from recipe_versions where recipe_id = $1',
    [recipeId],
  );
  return (result.rows[0]?.max ?? 0) + 1;
};

export const updateVersion = (
  versionId: string,
  opts: Omit<InsertVersionOptions, 'recipeId' | 'versionNumber' | 'createdVia'>,
  queryFn: QueryFn,
) =>
  queryFn(
    `update recipe_versions set
       title = $2, description = $3, servings = $4,
       prep_time_min = $5, cook_time_min = $6, image_url = $7, source_url = $8
     where id = $1 returning id`,
    [
      versionId,
      opts.title,
      opts.description,
      opts.servings,
      opts.prepTimeMin,
      opts.cookTimeMin,
      opts.imageUrl,
      opts.sourceUrl,
    ],
  );

export const setLineageStatus = (
  recipeId: string,
  userId: string,
  status: string,
  queryFn: QueryFn,
) =>
  queryFn(
    'update recipes set status = $3 where id = $1 and user_id = $2 returning id',
    [recipeId, userId, status],
  );

export const updateRecipeSlug = (
  recipeId: string,
  slug: string,
  queryFn: QueryFn,
) => queryFn('update recipes set slug = $2 where id = $1', [recipeId, slug]);

export const incrementContentRevision = (recipeId: string, queryFn: QueryFn) =>
  queryFn(
    'update recipes set content_revision = content_revision + 1 where id = $1',
    [recipeId],
  );

const GET_RECIPE_SHARING_SQL = `
  select id, user_id, visibility, share_token_hash
  from recipes
  where id = $1 and user_id = $2
`;

export type RecipeSharingRow = {
  id: string;
  user_id: string;
  visibility: string;
  share_token_hash: string | null;
};

export const getRecipeSharingRow = (
  recipeId: string,
  userId: string,
  queryFn: QueryFn,
) => queryFn<RecipeSharingRow>(GET_RECIPE_SHARING_SQL, [recipeId, userId]);

export const updateRecipeVisibility = (
  opts: {
    recipeId: string;
    userId: string;
    visibility: string;
    shareTokenHash: string | null;
  },
  queryFn: QueryFn,
) =>
  queryFn(
    `update recipes
     set visibility = $3, share_token_hash = $4
     where id = $1 and user_id = $2
     returning id`,
    [opts.recipeId, opts.userId, opts.visibility, opts.shareTokenHash],
  );

export const cloneVersionChildren = async (
  sourceVersionId: string,
  targetVersionId: string,
  queryFn: QueryFn,
) => {
  await queryFn(
    `insert into ingredients (recipe_version_id, sort_order, name, quantity, unit, notes, is_optional)
     select $2, sort_order, name, quantity, unit, notes, is_optional
     from ingredients where recipe_version_id = $1`,
    [sourceVersionId, targetVersionId],
  );
  await queryFn(
    `insert into instructions (recipe_version_id, step_number, body)
     select $2, step_number, body
     from instructions where recipe_version_id = $1`,
    [sourceVersionId, targetVersionId],
  );
  await queryFn(
    `insert into recipe_tags (recipe_version_id, tag_id)
     select $2, tag_id
     from recipe_tags where recipe_version_id = $1
     on conflict do nothing`,
    [sourceVersionId, targetVersionId],
  );
};

import type {
  CreateRecipeResult,
  RecipeDetail,
  RecipeInput,
  VersionCreatedVia,
} from '@eciperay/types';

import {runTransactional} from '../db/withTransaction.js';
import {query as defaultQuery} from '../db/query.js';
import {
  GET_RECIPE_DETAIL_SQL,
  deleteIngredientsByVersionId,
  deleteInstructionsByVersionId,
  deleteRecipeTagsByVersionId,
  insertIngredients,
  insertInstructions,
  linkTags,
} from '../routes/recipes/queries.js';
import {
  buildVersionOptions,
  incrementContentRevision,
  insertLineage,
  insertVersion,
  setActiveVersion,
  updateRecipeSlug,
  updateVersion,
} from '../routes/recipes/versionQueries.js';

import {mapRowToRecipeDetail} from './mapRowToRecipeDetail.js';
import {slugifyRecipeTitle} from './slugifyRecipeTitle.js';

type QueryFn = typeof defaultQuery;

type SaveRecipeFromInputOptions = {
  userId: string;
  input: RecipeInput;
  recipeId?: string;
  versionId?: string;
  createdVia?: VersionCreatedVia;
};

export class RecipeNotFoundError extends Error {
  constructor() {
    super('Recipe not found');
    this.name = 'RecipeNotFoundError';
  }
}

const replaceVersionChildren = async (
  versionId: string,
  input: RecipeInput,
  queryFn: QueryFn,
) => {
  await deleteIngredientsByVersionId(versionId, queryFn);
  await deleteInstructionsByVersionId(versionId, queryFn);
  await deleteRecipeTagsByVersionId(versionId, queryFn);
  await insertIngredients(versionId, input.ingredients, queryFn);
  await insertInstructions(versionId, input.instructions, queryFn);
  await linkTags(versionId, input.tagIds, queryFn);
};

const createLineageWithVersion = async (
  input: RecipeInput,
  userId: string,
  createdVia: VersionCreatedVia,
  queryFn: QueryFn,
): Promise<CreateRecipeResult> => {
  const lineage = await insertLineage(
    userId,
    slugifyRecipeTitle(input.title),
    queryFn,
  );
  const recipeId = lineage.rows[0]?.id;
  if (!recipeId) {
    throw new Error('Failed to create recipe lineage');
  }
  const version = await insertVersion(
    buildVersionOptions({input, recipeId, versionNumber: 1, createdVia}),
    queryFn,
  );
  const versionId = version.rows[0]?.id;
  if (!versionId) {
    throw new Error('Failed to create recipe version');
  }
  await setActiveVersion(recipeId, versionId, queryFn);
  await insertIngredients(versionId, input.ingredients, queryFn);
  await insertInstructions(versionId, input.instructions, queryFn);
  await linkTags(versionId, input.tagIds, queryFn);
  return {recipeId, versionId};
};

const updateExistingVersion = async (
  recipeId: string,
  versionId: string,
  input: RecipeInput,
  queryFn: QueryFn,
) => {
  const result = await updateVersion(
    versionId,
    buildVersionOptions({
      input,
      recipeId: '',
      versionNumber: 0,
      createdVia: 'manual',
    }),
    queryFn,
  );
  if (result.rowCount === 0) {
    throw new RecipeNotFoundError();
  }
  await updateRecipeSlug(recipeId, slugifyRecipeTitle(input.title), queryFn);
  await incrementContentRevision(recipeId, queryFn);
  await replaceVersionChildren(versionId, input, queryFn);
  return versionId;
};

const saveRecipe = async (
  opts: SaveRecipeFromInputOptions,
  queryFn: QueryFn,
): Promise<CreateRecipeResult> => {
  if (opts.versionId) {
    if (!opts.recipeId) {
      throw new RecipeNotFoundError();
    }
    await updateExistingVersion(
      opts.recipeId,
      opts.versionId,
      opts.input,
      queryFn,
    );
    return {recipeId: opts.recipeId, versionId: opts.versionId};
  }
  return createLineageWithVersion(
    opts.input,
    opts.userId,
    opts.createdVia ?? 'manual',
    queryFn,
  );
};

export const saveRecipeFromInput = async (
  opts: SaveRecipeFromInputOptions,
  queryFn: QueryFn,
): Promise<RecipeDetail> => {
  const ids = await runTransactional(queryFn, q => saveRecipe(opts, q));
  const detail = await queryFn(GET_RECIPE_DETAIL_SQL, [
    ids.recipeId,
    opts.userId,
  ]);
  const row = detail.rows[0];
  if (!row) {
    throw new RecipeNotFoundError();
  }
  return mapRowToRecipeDetail(
    row as Parameters<typeof mapRowToRecipeDetail>[0],
  );
};

export const saveNewRecipeFromInput = async (
  opts: Omit<SaveRecipeFromInputOptions, 'recipeId' | 'versionId'> & {
    createdVia: VersionCreatedVia;
  },
  queryFn: QueryFn,
): Promise<CreateRecipeResult & {recipe: RecipeDetail}> => {
  const ids = await runTransactional(queryFn, q =>
    createLineageWithVersion(opts.input, opts.userId, opts.createdVia, q),
  );
  const detail = await queryFn(GET_RECIPE_DETAIL_SQL, [
    ids.recipeId,
    opts.userId,
  ]);
  const row = detail.rows[0];
  if (!row) {
    throw new RecipeNotFoundError();
  }
  return {
    ...ids,
    recipe: mapRowToRecipeDetail(
      row as Parameters<typeof mapRowToRecipeDetail>[0],
    ),
  };
};

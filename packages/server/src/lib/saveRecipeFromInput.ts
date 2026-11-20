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
import {
  defaultVisibilityForProvenance,
  deriveRecipeProvenance,
} from './recipeProvenance.js';

import {
  autoImageContextFromDetail,
  scheduleAutoGenerateRecipeImage,
} from './autoGenerateRecipeImage.js';
import {mapRowToRecipeDetail} from './mapRowToRecipeDetail.js';
import {scheduleNutritionRefresh} from './refreshRecipeNutrition.js';
import {slugifyRecipeTitle} from './slugifyRecipeTitle.js';
import {touchMealsForRecipe} from './touchMealsForRecipe.js';

type QueryFn = typeof defaultQuery;

type SaveRecipeFromInputOptions = {
  userId: string;
  supabaseUid?: string;
  input: RecipeInput;
  recipeId?: string;
  versionId?: string;
  createdVia?: VersionCreatedVia;
  /** Explicit provenance detail where the creation path collects one (e.g. cookbook identification for a photo import, #609). */
  provenanceDetail?: string | null;
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

const SET_PROVENANCE_SQL = `
  update recipes
  set provenance_source = $2, provenance_detail = $3, visibility = $4
  where id = $1
`;

const createLineageWithVersion = async (
  input: RecipeInput,
  userId: string,
  createdVia: VersionCreatedVia,
  queryFn: QueryFn,
  provenanceDetail?: string | null,
): Promise<CreateRecipeResult> => {
  // #609: every new recipe records its provenance at creation (derived
  // from the creation path; validated per type) and takes the
  // public-by-default visibility for that provenance.
  const provenance = deriveRecipeProvenance(createdVia, input, provenanceDetail);
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
  await queryFn(SET_PROVENANCE_SQL, [
    recipeId,
    provenance.source,
    provenance.detail,
    defaultVisibilityForProvenance(provenance),
  ]);
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
  // An editable-version save changes what meal detail reads for each
  // member meal, so advance those meals' updated_at (their ETag token,
  // #384) inside this same transaction (#394) — the metadata-only path
  // through saveRecipeMetadata does the same.
  await touchMealsForRecipe(recipeId, queryFn);
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
    opts.provenanceDetail,
  );
};

export const saveRecipeFromInput = async (
  opts: SaveRecipeFromInputOptions,
  queryFn: QueryFn,
): Promise<RecipeDetail> => {
  const ids = await runTransactional(queryFn, q => saveRecipe(opts, q));
  scheduleNutritionRefresh(ids.versionId, queryFn);
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
    createLineageWithVersion(opts.input, opts.userId, opts.createdVia, q, opts.provenanceDetail),
  );
  scheduleNutritionRefresh(ids.versionId, queryFn);
  const detail = await queryFn(GET_RECIPE_DETAIL_SQL, [
    ids.recipeId,
    opts.userId,
  ]);
  const row = detail.rows[0];
  if (!row) {
    throw new RecipeNotFoundError();
  }
  const recipe = mapRowToRecipeDetail(
    row as Parameters<typeof mapRowToRecipeDetail>[0],
  );
  // #535: fire the auto-image trigger from the shared save layer so every
  // new-recipe path is covered in one place — import URL/text/image, AI
  // create-session saves, bulk import, and manual/MCP create (createRecipe
  // no longer schedules separately). Best-effort and deferred, mirroring
  // scheduleNutritionRefresh above; the scheduler itself skips recipes
  // that already carry an image. Callers without a supabaseUid (internal
  // saves) simply don't schedule.
  if (opts.supabaseUid && !recipe.imageUrl) {
    scheduleAutoGenerateRecipeImage(
      {
        userId: opts.userId,
        supabaseUid: opts.supabaseUid,
        recipe: autoImageContextFromDetail(recipe),
      },
      queryFn,
    );
  }
  return {...ids, recipe};
};

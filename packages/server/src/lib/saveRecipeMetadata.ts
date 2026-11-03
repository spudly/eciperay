import type {RecipeDetail, RecipeMetadataInput} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';
import {runTransactional} from '../db/withTransaction.js';
import {
  deleteRecipeTagsByVersionId,
  GET_RECIPE_DETAIL_SQL,
  linkTags,
} from '../routes/recipes/queries.js';
import {
  updateRecipeSlug,
  updateVersion,
} from '../routes/recipes/versionQueries.js';
import {updateRecipeStatus} from '../routes/recipes/recipeStatusQueries.js';

import {mapRowToRecipeDetail} from './mapRowToRecipeDetail.js';
import {scheduleNutritionRefresh} from './refreshRecipeNutrition.js';
import {RecipeNotFoundError} from './saveRecipeFromInput.js';
import {resolveStatus} from './resolveStatus.js';
import {slugifyRecipeTitle} from './slugifyRecipeTitle.js';
import {touchMealsForRecipe} from './touchMealsForRecipe.js';

type QueryFn = typeof defaultQuery;

type SaveRecipeMetadataOptions = {
  userId: string;
  recipeId: string;
  versionId: string;
  input: RecipeMetadataInput;
};

const saveMetadata = async (
  opts: SaveRecipeMetadataOptions,
  queryFn: QueryFn,
) => {
  const result = await updateVersion(
    opts.versionId,
    {
      title: opts.input.title,
      description: opts.input.description ?? null,
      servings: opts.input.servings,
      prepTimeMin: opts.input.prepTimeMin ?? null,
      cookTimeMin: opts.input.cookTimeMin ?? null,
      imageUrl: opts.input.imageUrl ?? null,
      sourceUrl: opts.input.sourceUrl ?? null,
    },
    queryFn,
  );
  if (result.rowCount === 0) {
    throw new RecipeNotFoundError();
  }
  await updateRecipeSlug(
    opts.recipeId,
    slugifyRecipeTitle(opts.input.title),
    queryFn,
  );
  await updateRecipeStatus(opts.recipeId, resolveStatus(opts.input), queryFn);
  await deleteRecipeTagsByVersionId(opts.versionId, queryFn);
  await linkTags(opts.versionId, opts.input.tagIds, queryFn);
  // A metadata-only edit changes what meal detail reads for each member
  // meal, so advance those meals' updated_at (their ETag token, #384)
  // inside this same transaction (#394).
  await touchMealsForRecipe(opts.recipeId, queryFn);
};

export const saveRecipeMetadata = async (
  opts: SaveRecipeMetadataOptions,
  queryFn: QueryFn,
): Promise<RecipeDetail> => {
  await runTransactional(queryFn, q => saveMetadata(opts, q));
  scheduleNutritionRefresh(opts.versionId, queryFn);
  const detail = await queryFn(GET_RECIPE_DETAIL_SQL, [
    opts.recipeId,
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

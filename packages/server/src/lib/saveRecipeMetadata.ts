import type {RecipeDetail, RecipeMetadataInput} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';
import {
  deleteRecipeTagsByVersionId,
  GET_RECIPE_DETAIL_SQL,
  linkTags,
} from '../routes/recipes/queries.js';
import {
  updateRecipeSlug,
  updateVersion,
} from '../routes/recipes/versionQueries.js';
import {updateRecipeDevelopmentStatus} from '../routes/recipes/recipeDevelopmentStatusQueries.js';

import {mapRowToRecipeDetail} from './mapRowToRecipeDetail.js';
import {RecipeNotFoundError} from './saveRecipeFromInput.js';
import {resolveDevelopmentStatus} from './resolveDevelopmentStatus.js';
import {slugifyRecipeTitle} from './slugifyRecipeTitle.js';

type QueryFn = typeof defaultQuery;

export const saveRecipeMetadata = async (
  opts: {
    userId: string;
    recipeId: string;
    versionId: string;
    input: RecipeMetadataInput;
  },
  queryFn: QueryFn,
): Promise<RecipeDetail> => {
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
  await updateRecipeDevelopmentStatus(
    opts.recipeId,
    resolveDevelopmentStatus(opts.input),
    queryFn,
  );
  await deleteRecipeTagsByVersionId(opts.versionId, queryFn);
  await linkTags(opts.versionId, opts.input.tagIds, queryFn);
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

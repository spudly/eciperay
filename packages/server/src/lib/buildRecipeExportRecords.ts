import type {RecipeExportRecord} from '@eciperay/types';

import {GET_RECIPE_DETAIL_SQL} from '../routes/recipes/queries.js';
import type {query as defaultQuery} from '../db/query.js';

import {mapRowToRecipeDetail} from './mapRowToRecipeDetail.js';
import {recipeDetailToExportRecord} from './recipeDetailToExportRecord.js';
import {fetchImageAsBase64} from './remoteImageDownload.js';

type QueryFn = typeof defaultQuery;

const stripImageCacheKey = (url: string) => {
  const [withoutQuery] = url.split('?');
  /* c8 ignore next -- split always returns at least one segment */
  return withoutQuery ?? url;
};

export const buildRecipeExportRecords = async (
  recipeIds: string[],
  userId: string,
  queryFn: QueryFn,
): Promise<RecipeExportRecord[]> => {
  const recipes: RecipeExportRecord[] = [];

  for (const id of recipeIds) {
    const detailResult = await queryFn(GET_RECIPE_DETAIL_SQL, [id, userId]);
    const detailRow = detailResult.rows[0];
    if (!detailRow) {
      continue;
    }
    const detail = mapRowToRecipeDetail(
      detailRow as Parameters<typeof mapRowToRecipeDetail>[0],
    );
    let image: {base64: string; contentType: string} | undefined;
    if (detail.imageUrl) {
      const fetched = await fetchImageAsBase64(
        stripImageCacheKey(detail.imageUrl),
      );
      image = fetched ?? undefined;
    }
    recipes.push(recipeDetailToExportRecord(detail, image));
  }

  return recipes;
};

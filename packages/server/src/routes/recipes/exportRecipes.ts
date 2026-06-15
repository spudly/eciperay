import type {Response} from 'express';
import type {RecipeExportBundle} from '@recipoo/types';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {mapRowToRecipeDetail} from '../../lib/mapRowToRecipeDetail.js';
import {recipeDetailToExportRecord} from '../../lib/recipeDetailToExportRecord.js';
import {ExportRecipesSchema, validate} from '../../lib/schemas.js';
import {fetchImageAsBase64} from '../../lib/uploadRecipeImageServer.js';

import {GET_RECIPE_DETAIL_SQL} from './queries.js';

type QueryFn = typeof defaultQuery;

const LIST_RECIPE_IDS_SQL = `
  select id from recipes
  where user_id = $1 and id = any($2::uuid[])
  order by updated_at desc
`;

const stripImageCacheKey = (url: string) => url.split('?')[0] ?? url;

export const exportRecipes = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(ExportRecipesSchema, req, res);
  if (!body.ok) {
    return;
  }

  const idsResult = await queryFn(LIST_RECIPE_IDS_SQL, [
    req.userId,
    body.data.recipeIds,
  ]);
  const recipes = [];

  for (const row of idsResult.rows) {
    const {id} = row as {id: string};
    const detailResult = await queryFn(GET_RECIPE_DETAIL_SQL, [id, req.userId]);
    const detailRow = detailResult.rows[0];
    if (!detailRow) {
      continue;
    }
    const detail = mapRowToRecipeDetail(
      detailRow as Parameters<typeof mapRowToRecipeDetail>[0],
    );
    let image;
    if (detail.imageUrl) {
      image =
        (await fetchImageAsBase64(stripImageCacheKey(detail.imageUrl))) ??
        undefined;
    }
    recipes.push(recipeDetailToExportRecord(detail, image));
  }

  const bundle: RecipeExportBundle = {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    recipes,
  };
  res.json(bundle);
};

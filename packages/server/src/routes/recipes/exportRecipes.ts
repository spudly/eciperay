import type {Response} from 'express';
import type {RecipeExportBundle} from '@eciperay/types';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {buildRecipeExportRecords} from '../../lib/buildRecipeExportRecords.js';
import {ExportRecipesSchema} from '../../lib/exportRecipesSchema.js';
import {validate} from '../../lib/validate.js';

type QueryFn = typeof defaultQuery;

const LIST_RECIPE_IDS_SQL = `
  select id from recipes
  where user_id = $1 and id = any($2::uuid[])
  order by updated_at desc
`;

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
  const recipeIds = idsResult.rows.map(row => (row as {id: string}).id);
  const recipes = await buildRecipeExportRecords(
    recipeIds,
    req.userId,
    queryFn,
  );

  const bundle: RecipeExportBundle = {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    recipes,
  };
  res.json(bundle);
};

import type {RecipeDetail} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';
import {GET_RECIPE_DETAIL_SQL} from '../routes/recipes/queries.js';

import {mapRowToRecipeDetail} from './mapRowToRecipeDetail.js';

type QueryFn = typeof defaultQuery;

export const fetchRecipeDetail = async (
  recipeId: string,
  userId: string,
  queryFn: QueryFn,
): Promise<RecipeDetail | null> => {
  const result = await queryFn(GET_RECIPE_DETAIL_SQL, [recipeId, userId]);
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return mapRowToRecipeDetail(
    row as Parameters<typeof mapRowToRecipeDetail>[0],
  );
};

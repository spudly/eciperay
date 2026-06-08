import type {RecipeDetail} from '@recipoo/types';

import {query as defaultQuery} from '../db/query.js';
import {GET_RECIPE_DETAIL_SQL} from '../routes/recipes/queries.js';

type QueryFn = typeof defaultQuery;

export const fetchRecipeDetail = async (
  recipeId: string,
  userId: string,
  queryFn: QueryFn,
): Promise<RecipeDetail | null> => {
  const result = await queryFn(GET_RECIPE_DETAIL_SQL, [recipeId, userId]);
  return (result.rows[0] as RecipeDetail | undefined) ?? null;
};

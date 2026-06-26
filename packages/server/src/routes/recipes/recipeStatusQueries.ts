import type {RecipeStatus} from '@eciperay/types';

import {query as defaultQuery} from '../../db/query.js';

type QueryFn = typeof defaultQuery;

export const updateRecipeStatus = (
  recipeId: string,
  status: RecipeStatus,
  queryFn: QueryFn,
) =>
  queryFn('update recipes set status = $2 where id = $1', [recipeId, status]);

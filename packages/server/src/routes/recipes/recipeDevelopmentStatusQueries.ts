import type {RecipeDevelopmentStatus} from '@eciperay/types';

import {query as defaultQuery} from '../../db/query.js';

type QueryFn = typeof defaultQuery;

export const updateRecipeDevelopmentStatus = (
  recipeId: string,
  developmentStatus: RecipeDevelopmentStatus,
  queryFn: QueryFn,
) =>
  queryFn('update recipes set development_status = $2 where id = $1', [
    recipeId,
    developmentStatus,
  ]);

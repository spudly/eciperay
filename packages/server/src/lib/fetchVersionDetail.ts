import type {RecipeVersionDetail} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';
import {GET_VERSION_DETAIL_SQL} from '../routes/recipes/queries.js';

import {mapRowToVersionDetail} from './mapRowToRecipeDetail.js';

type QueryFn = typeof defaultQuery;

export const fetchVersionDetail = async (
  versionId: string,
  recipeId: string,
  userId: string,
  queryFn: QueryFn,
): Promise<RecipeVersionDetail | null> => {
  const result = await queryFn(GET_VERSION_DETAIL_SQL, [
    versionId,
    recipeId,
    userId,
  ]);
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return mapRowToVersionDetail(
    row as Parameters<typeof mapRowToVersionDetail>[0],
  );
};

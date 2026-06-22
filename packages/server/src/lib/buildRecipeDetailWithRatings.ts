import type {RecipeDetail, RecipeRatingSummary} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';

import {loadRecipeRatingSummary} from './loadRecipeRatingSummary.js';
import {mapRowToRecipeDetail} from './mapRowToRecipeDetail.js';

type QueryFn = typeof defaultQuery;

export const buildRecipeDetailWithRatings = async (
  row: Parameters<typeof mapRowToRecipeDetail>[0],
  viewerUserId: string | undefined,
  queryFn: QueryFn,
): Promise<RecipeDetail & RecipeRatingSummary> => {
  const detail = mapRowToRecipeDetail(row);
  const ratings = await loadRecipeRatingSummary(
    {
      recipeId: detail.id,
      ownerUserId: detail.userId,
      contentRevision: detail.contentRevision,
      ownerStarRating: detail.starRating,
      viewerUserId,
    },
    queryFn,
  );
  return {...detail, ...ratings};
};

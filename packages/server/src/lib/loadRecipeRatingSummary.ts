import type {
  RecipeCommunityRating,
  RecipeRatingSummary,
  RecipeStarRating,
} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';
import {
  getViewerCommunityRating,
  listCommunityRatingRows,
} from '../routes/recipes/recipeRatingQueries.js';

import {computeCommunityRating} from './computeCommunityRating.js';

type QueryFn = typeof defaultQuery;

type LoadRecipeRatingSummaryOptions = {
  recipeId: string;
  ownerUserId: string;
  contentRevision: number;
  ownerStarRating: RecipeStarRating | null;
  viewerUserId?: string;
};

export const loadRecipeRatingSummary = async (
  opts: LoadRecipeRatingSummaryOptions,
  queryFn: QueryFn,
): Promise<RecipeRatingSummary> => {
  const communityRows = await listCommunityRatingRows(opts.recipeId, queryFn);
  const communityRating: RecipeCommunityRating | null = computeCommunityRating(
    communityRows.rows.map(row => ({
      stars: row.stars,
      contentRevision: row.content_revision,
    })),
    opts.contentRevision,
  );

  if (!opts.viewerUserId) {
    return {communityRating, viewerRating: null};
  }

  if (opts.viewerUserId === opts.ownerUserId) {
    return {communityRating, viewerRating: opts.ownerStarRating};
  }

  const viewerRating = await getViewerCommunityRating(
    opts.recipeId,
    opts.viewerUserId,
    queryFn,
  );
  return {communityRating, viewerRating};
};

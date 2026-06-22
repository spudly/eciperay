import type {RecipeCommunityRating} from '@eciperay/types';

export type CommunityRatingRow = {stars: number; contentRevision: number};

export const computeCommunityRating = (
  ratings: CommunityRatingRow[],
  recipeContentRevision: number,
): RecipeCommunityRating | null => {
  if (ratings.length === 0) {
    return null;
  }

  let weightedSum = 0;
  let weightTotal = 0;

  for (const rating of ratings) {
    const weight = rating.contentRevision < recipeContentRevision ? 0.5 : 1;
    weightedSum += rating.stars * weight;
    weightTotal += weight;
  }

  const average = Math.round((weightedSum / weightTotal) * 10) / 10;
  const hasStaleRatings = ratings.some(
    rating => rating.contentRevision < recipeContentRevision,
  );
  return {average, count: ratings.length, hasStaleRatings};
};

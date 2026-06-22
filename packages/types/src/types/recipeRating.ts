export type RecipeStarRating = 1 | 2 | 3 | 4 | 5;

export type RecipeCommunityRating = {average: number; count: number};

export type RecipeRatingSummary = {
  communityRating: RecipeCommunityRating | null;
  viewerRating: RecipeStarRating | null;
};

export type RecipeRatingInput = {stars: RecipeStarRating};

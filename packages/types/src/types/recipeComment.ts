export type RecipeComment = {
  id: string;
  recipeId: string;
  authorUserId: string;
  authorDisplayName: string | null;
  body: string;
  contentRevision: number | null;
  isStale: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RecipeCommentInput = {body: string};

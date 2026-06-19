export type CookLog = {
  id: string;
  recipeVersionId: string;
  userId: string;
  cookedAt: string;
  authorStarRating: 1 | 2 | 3 | 4 | 5 | null;
  notes: string | null;
  createdAt: string;
};

export type CookLogInput = {
  authorStarRating?: 1 | 2 | 3 | 4 | 5 | null;
  notes?: string | null;
};

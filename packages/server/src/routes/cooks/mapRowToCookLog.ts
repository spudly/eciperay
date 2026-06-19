import type {CookLog} from '@eciperay/types';

type CookLogRow = {
  id: string;
  recipe_version_id: string;
  user_id: string;
  cooked_at: string;
  author_star_rating: 1 | 2 | 3 | 4 | 5 | null;
  notes: string | null;
  created_at: string;
};

export const mapRowToCookLog = (row: CookLogRow): CookLog => ({
  id: row.id,
  recipeVersionId: row.recipe_version_id,
  userId: row.user_id,
  cookedAt: row.cooked_at,
  authorStarRating: row.author_star_rating,
  notes: row.notes,
  createdAt: row.created_at,
});

import type {CookLog} from '@eciperay/types';

export const makeCookLogRow = (overrides: Partial<CookLog> = {}) => ({
  id: overrides.id ?? 'cook-log-uuid-1',
  recipe_version_id: overrides.recipeVersionId ?? 'version-uuid-1',
  user_id: overrides.userId ?? 'user-uuid-1',
  cooked_at: overrides.cookedAt ?? '2024-01-02T00:00:00.000Z',
  author_star_rating: overrides.authorStarRating ?? 4,
  notes: overrides.notes ?? 'Turned out great',
  created_at: overrides.createdAt ?? '2024-01-02T00:00:00.000Z',
});

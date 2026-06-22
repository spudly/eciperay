import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

import {loadRecipeRatingSummary} from './loadRecipeRatingSummary.js';

describe('loadRecipeRatingSummary', () => {
  test('returns null viewer rating when viewer is omitted', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(
      makeQueryResult([{stars: 4, content_revision: 1}]),
    );

    const summary = await loadRecipeRatingSummary(
      {
        recipeId: 'recipe-uuid-1',
        ownerUserId: 'owner-uuid',
        contentRevision: 1,
        ownerStarRating: null,
      },
      mockQuery,
    );

    expect(summary.viewerRating).toBeNull();
    expect(summary.viewerRatingIsStale).toBe(false);
  });

  test('returns owner star rating as viewer rating', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const summary = await loadRecipeRatingSummary(
      {
        recipeId: 'recipe-uuid-1',
        ownerUserId: 'owner-uuid',
        contentRevision: 1,
        ownerStarRating: 3,
        viewerUserId: 'owner-uuid',
      },
      mockQuery,
    );

    expect(summary.viewerRating).toBe(3);
    expect(summary.communityRating).toBeNull();
  });

  test('loads viewer community rating for a non-owner', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockImplementation(((sql: string) => {
      if (sql.includes('rr.user_id <> r.user_id')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (sql.includes('where recipe_id = $1 and user_id = $2')) {
        return Promise.resolve(
          makeQueryResult([{stars: 4, content_revision: 1}]),
        );
      }
      return Promise.resolve(makeQueryResult([]));
    }) as typeof mockQuery);

    const summary = await loadRecipeRatingSummary(
      {
        recipeId: 'recipe-uuid-1',
        ownerUserId: 'owner-uuid',
        contentRevision: 2,
        ownerStarRating: null,
        viewerUserId: 'viewer-uuid',
      },
      mockQuery,
    );

    expect(summary.viewerRating).toBe(4);
    expect(summary.viewerRatingIsStale).toBe(true);
  });

  test('returns false viewerRatingIsStale when viewer has no rating', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('rr.user_id <> r.user_id')) {
        return Promise.resolve(makeQueryResult([]));
      }
      if (sql.includes('where recipe_id = $1 and user_id = $2')) {
        return Promise.resolve(makeQueryResult([]));
      }
      return Promise.resolve(makeQueryResult([]));
    });

    const summary = await loadRecipeRatingSummary(
      {
        recipeId: 'recipe-uuid-1',
        ownerUserId: 'owner-uuid',
        contentRevision: 2,
        ownerStarRating: null,
        viewerUserId: 'viewer-uuid',
      },
      mockQuery,
    );

    expect(summary.viewerRating).toBeNull();
    expect(summary.viewerRatingIsStale).toBe(false);
  });
});

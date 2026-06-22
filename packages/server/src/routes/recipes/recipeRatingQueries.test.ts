import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';

import {
  deleteCommunityRating,
  getViewerCommunityRating,
  updateOwnerStarRating,
  upsertCommunityRating,
} from './recipeRatingQueries.js';

describe('recipeRatingQueries', () => {
  test('upserts a community rating with content revision', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([]));
    await upsertCommunityRating(
      {
        recipeId: 'recipe-uuid-1',
        userId: 'viewer-uuid',
        stars: 4,
        contentRevision: 3,
      },
      mockQuery,
    );
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      'recipe-uuid-1',
      'viewer-uuid',
      4,
      3,
    ]);
  });

  test('reads and deletes community ratings', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([]));
    await updateOwnerStarRating('recipe-uuid-1', 'owner-uuid', 5, mockQuery);
    await deleteCommunityRating('recipe-uuid-1', 'viewer-uuid', mockQuery);
    const rating = await getViewerCommunityRating(
      'recipe-uuid-1',
      'viewer-uuid',
      mockQuery,
    );
    expect(rating).toBeNull();
  });

  test('reads viewer community rating row', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(
      makeQueryResult([{stars: 4, content_revision: 2}]),
    );
    const rating = await getViewerCommunityRating(
      'recipe-uuid-1',
      'viewer-uuid',
      mockQuery,
    );
    expect(rating).toEqual({stars: 4, contentRevision: 2});
  });
});

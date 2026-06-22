import {makeRecipeDetailRow} from '../test/fixtures/recipeRow.js';
import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

import {buildRecipeDetailWithRatings} from './buildRecipeDetailWithRatings.js';

describe('buildRecipeDetailWithRatings', () => {
  test('merges recipe detail with rating summary fields', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const detail = await buildRecipeDetailWithRatings(
      makeRecipeDetailRow({star_rating: 4}),
      'user-uuid-1',
      mockQuery,
    );

    expect(detail.starRating).toBe(4);
    expect(detail.communityRating).toBeNull();
    expect(detail.viewerRating).toBe(4);
    expect(detail.viewerRatingIsStale).toBe(false);
  });
});

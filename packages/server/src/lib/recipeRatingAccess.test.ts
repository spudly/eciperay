import {jest} from '@jest/globals';

import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';
import {makeRecipeDetailRow} from '../test/fixtures/recipeRow.js';

import {
  loadReadableRecipeRow,
  respondWithRecipeAndRatings,
} from './recipeRatingAccess.js';

describe('recipeRatingAccess', () => {
  test('returns null when the viewer cannot read the recipe', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(
      makeQueryResult([makeRecipeDetailRow({visibility: 'private'})]),
    );

    const row = await loadReadableRecipeRow(
      'recipe-uuid-1',
      'viewer-uuid',
      mockQuery,
    );

    expect(row).toBeNull();
  });

  test('returns null when the recipe does not exist', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([]));

    const row = await loadReadableRecipeRow(
      'recipe-uuid-1',
      'viewer-uuid',
      mockQuery,
    );

    expect(row).toBeNull();
  });

  test('responds 404 when recipe becomes unreadable before response', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const res = {status: jest.fn().mockReturnThis(), json: jest.fn()};

    await respondWithRecipeAndRatings(
      'recipe-uuid-1',
      'viewer-uuid',
      res as never,
      mockQuery,
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

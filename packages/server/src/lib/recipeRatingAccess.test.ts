import {jest} from '@jest/globals';

import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';
import {makeRecipeDetailRow} from '../test/fixtures/recipeRow.js';

import {loadReadableRecipeRow} from './recipeReadAccess.js';
import {respondWithRecipeAndRatings} from './recipeRatingAccess.js';

describe('recipeRatingAccess', () => {
  test('returns null when the viewer cannot read the recipe', async () => {
    const mockQuery = createMockQuery();
    // The viewer holds no share grant: the grant lookup comes back empty
    // (a grant holder CAN read a private recipe since #534 — that case
    // is covered in recipeAccess.test.ts).
    mockQuery.mockImplementation(((sql: string) =>
      Promise.resolve(
        sql.includes('recipe_share_grants')
          ? makeQueryResult([])
          : makeQueryResult([makeRecipeDetailRow({visibility: 'private'})]),
      )) as typeof mockQuery);

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

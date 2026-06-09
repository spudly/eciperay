import {makeRecipeDetail} from '../test/fixtures/recipe.js';
import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

import {fetchRecipeDetail} from './recipeQueries.js';

describe('fetchRecipeDetail', () => {
  test('returns RecipeDetail when a row is found', async () => {
    const detail = makeRecipeDetail();
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([detail]));
    const result = await fetchRecipeDetail(
      'recipe-uuid-1',
      'user-uuid-1',
      mockQuery,
    );
    expect(result).toEqual(detail);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  test('returns null when no rows are found', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const result = await fetchRecipeDetail(
      'missing-id',
      'user-uuid-1',
      mockQuery,
    );
    expect(result).toBeNull();
  });

  test('passes recipeId and userId as query params', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([]));
    await fetchRecipeDetail('r-1', 'u-1', mockQuery);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['r-1', 'u-1']);
  });
});

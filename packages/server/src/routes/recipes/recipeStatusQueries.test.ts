import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';

import {updateRecipeStatus} from './recipeStatusQueries.js';

describe('updateRecipeStatus', () => {
  test('updates status for a recipe', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([]));
    await updateRecipeStatus('recipe-uuid-1', 'perfected', mockQuery);
    expect(mockQuery).toHaveBeenCalledWith(
      'update recipes set status = $2 where id = $1',
      ['recipe-uuid-1', 'perfected'],
    );
  });
});

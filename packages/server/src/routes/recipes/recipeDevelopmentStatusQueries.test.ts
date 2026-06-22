import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';

import {updateRecipeDevelopmentStatus} from './recipeDevelopmentStatusQueries.js';

describe('updateRecipeDevelopmentStatus', () => {
  test('updates development status for a recipe', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([]));
    await updateRecipeDevelopmentStatus(
      'recipe-uuid-1',
      'perfected',
      mockQuery,
    );
    expect(mockQuery).toHaveBeenCalledWith(
      'update recipes set development_status = $2 where id = $1',
      ['recipe-uuid-1', 'perfected'],
    );
  });
});

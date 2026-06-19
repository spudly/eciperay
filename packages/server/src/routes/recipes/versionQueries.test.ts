import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';

import {getNextVersionNumber} from './versionQueries.js';

describe('versionQueries', () => {
  test('returns 1 when no versions exist yet', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([{max: null}]));
    await expect(
      getNextVersionNumber('recipe-uuid-1', mockQuery),
    ).resolves.toBe(1);
  });
});

import {makeVersionDetailRow} from '../test/fixtures/versionRow.js';
import {makeQueryResult} from '../test/fixtures/queryResult.js';
import {createMockQuery} from '../test/mockQuery.js';

import {fetchVersionDetail} from './fetchVersionDetail.js';

describe('fetchVersionDetail', () => {
  test('returns mapped version detail when found', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([makeVersionDetailRow()]));
    const detail = await fetchVersionDetail(
      'version-uuid-1',
      'recipe-uuid-1',
      'user-uuid-1',
      mockQuery,
    );
    expect(detail?.title).toBe('Test Recipe');
  });

  test('returns null when version is not found', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const detail = await fetchVersionDetail(
      'missing',
      'recipe-uuid-1',
      'user-uuid-1',
      mockQuery,
    );
    expect(detail).toBeNull();
  });
});
